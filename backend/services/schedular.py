
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from database import AsyncSessionLocal
from models import Monitor
from services.checker import check_endpoint


scheduler = AsyncIOScheduler()


async def check_single_monitor(monitor_id: str):
    async with AsyncSessionLocal() as db:
        monitor = await db.get(Monitor, monitor_id)

        if not monitor or not monitor.is_active:
            return

        try:
            print(f"Checking monitor: {monitor.name}")

            result = await check_endpoint(
                url=monitor.url,
                method=monitor.method,
                timeout_seconds=monitor.timeout_seconds,
                monitor_id=monitor.id,
                db=db
            )

            print(f"Check result: {result}")

        except Exception as error:
            print(f"Monitoring error: {error}")


async def refresh_monitor_jobs():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Monitor).where(Monitor.is_active == True)
        )

        active_monitors = result.scalars().all()
        active_job_ids = set()

        for monitor in active_monitors:
            job_id = f"monitor_{monitor.id}"
            active_job_ids.add(job_id)

            existing_job = scheduler.get_job(job_id)

            if existing_job is None:
                scheduler.add_job(
                    check_single_monitor,
                    trigger="interval",
                    seconds=monitor.interval_seconds,
                    args=[monitor.id],
                    id=job_id,
                    max_instances=1
                )

            elif int(existing_job.trigger.interval.total_seconds()) != monitor.interval_seconds:
                scheduler.reschedule_job(
                    job_id,
                    trigger="interval",
                    seconds=monitor.interval_seconds
                )

        for job in scheduler.get_jobs():
            if (
                job.id.startswith("monitor_")
                and job.id not in active_job_ids
            ):
                scheduler.remove_job(job.id)


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            refresh_monitor_jobs,
            trigger="interval",
            seconds=15,
            id="refresh_monitor_jobs",
            replace_existing=True
        )

        scheduler.start()
        print("API Sentinel scheduler started!")
