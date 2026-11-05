
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from services.checker import check_endpoint
from services.schedular import start_scheduler, scheduler
from database import get_db
from models import Monitor, CheckResult
from schemas import MonitorCreate, MonitorResponse

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="API Sentinel",
    description="API uptime and performance monitoring platform",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def home():
    return {
        "message": "Welcome to API Sentinel!",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Register a new API monitor
@app.post("/api/monitors", response_model=MonitorResponse, status_code=201)
async def create_monitor(
    monitor_data: MonitorCreate,
    db: AsyncSession = Depends(get_db)
):
    if monitor_data.method not in ("GET", "HEAD"):
        raise HTTPException(
            status_code=400,
            detail="Only GET and HEAD methods are supported"
        )

    new_monitor = Monitor(
        name=monitor_data.name,
        url=str(monitor_data.url),
        method=monitor_data.method,
        interval_seconds=monitor_data.interval_seconds,
        timeout_seconds=monitor_data.timeout_seconds
    )

    db.add(new_monitor)

    await db.commit()
    await db.refresh(new_monitor)

    return new_monitor


# Retrieve all registered monitors
@app.get("/api/monitors", response_model=list[MonitorResponse])
async def get_monitors(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Monitor).order_by(Monitor.created_at.desc())
    )

    return result.scalars().all()


# Run a manual API check
@app.post("/api/monitors/{monitor_id}/check")
async def run_monitor_check(
    monitor_id: str,
    db: AsyncSession = Depends(get_db)
):
    monitor = await db.get(Monitor, monitor_id)

    if not monitor:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found"
        )

    if not monitor.is_active:
        raise HTTPException(
            status_code=400,
            detail="Monitor is inactive"
        )

    result = await check_endpoint(
        url=monitor.url,
        method=monitor.method,
        timeout_seconds=monitor.timeout_seconds,
        monitor_id=monitor.id,
        db=db
    )

    return {
        "monitor_id": monitor.id,
        "monitor_name": monitor.name,
        "check_result": result
    }


# Get monitor statistics: uptime and average response time
@app.get("/api/monitors/{monitor_id}/stats")
async def get_monitor_stats(
    monitor_id: str,
    db: AsyncSession = Depends(get_db)
):
    monitor = await db.get(Monitor, monitor_id)

    if not monitor:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found"
        )

    result = await db.execute(
        select(
            func.count(CheckResult.id).label("total_checks"),

            func.sum(
                case(
                    (CheckResult.is_success == True, 1),
                    else_=0
                )
            ).label("successful_checks"),

            func.avg(
    case(
        (CheckResult.is_success == True, CheckResult.response_time_ms),
        else_=None
    )
).label("average_response_time")
        ).where(
            CheckResult.monitor_id == monitor_id
        )
    )

    stats = result.one()

    total_checks = stats.total_checks or 0
    successful_checks = stats.successful_checks or 0
    failed_checks = total_checks - successful_checks

    uptime_percentage = (
        (successful_checks / total_checks) * 100
        if total_checks > 0
        else 0.0
    )

    average_response_time = (
        round(float(stats.average_response_time), 2)
        if stats.average_response_time is not None
        else None
    )

    return {
        "monitor_id": monitor.id,
        "monitor_name": monitor.name,
        "total_checks": total_checks,
        "successful_checks": successful_checks,
        "failed_checks": failed_checks,
        "uptime_percentage": round(uptime_percentage, 2),
        "average_response_time_ms": average_response_time
    }


# Retrieve monitor history
@app.get("/api/monitors/{monitor_id}/history")
async def get_monitor_history(
    monitor_id: str,
    db: AsyncSession = Depends(get_db)
):
    monitor = await db.get(Monitor, monitor_id)

    if not monitor:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found"
        )

    result = await db.execute(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(50)
    )

    history = result.scalars().all()

    return {
        "monitor_id": monitor_id,
        "monitor_name": monitor.name,
        "total_results": len(history),
        "history": [
            {
                "status_code": item.status_code,
                "response_time_ms": item.response_time_ms,
                "is_success": item.is_success,
                "error_message": item.error_message,
                "checked_at": item.checked_at
            }
            for item in history
        ]
    }


# Pause or resume a monitor
@app.patch("/api/monitors/{monitor_id}/toggle")
async def toggle_monitor(
    monitor_id: str,
    db: AsyncSession = Depends(get_db)
):
    monitor = await db.get(Monitor, monitor_id)

    if not monitor:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found"
        )

    monitor.is_active = not monitor.is_active

    await db.commit()
    await db.refresh(monitor)

    return {
        "monitor_id": monitor.id,
        "monitor_name": monitor.name,
        "is_active": monitor.is_active,
        "message": "Monitor status updated successfully"
    }
