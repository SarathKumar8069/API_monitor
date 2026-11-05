
from models import CheckResult
import time
import httpx

from sqlalchemy.ext.asyncio import AsyncSession


async def check_endpoint(
    url: str,
    method: str,
    timeout_seconds: int,
    monitor_id: str,
    db: AsyncSession
):
    start_time = time.perf_counter()

    try:
        async with httpx.AsyncClient(
            timeout=timeout_seconds,
            follow_redirects=False
        ) as client:

            response = await client.request(method, url)

            response_time = (
                time.perf_counter() - start_time
            ) * 1000

            result = {
                "status_code": response.status_code,
                "response_time_ms": round(response_time, 2),
                "is_success": response.status_code < 400,
                "error_message": None
            }

    except httpx.TimeoutException:
        result = {
            "status_code": None,
            "response_time_ms": round(
                (time.perf_counter() - start_time) * 1000, 2
            ),
            "is_success": False,
            "error_message": "Request timed out"
        }

    except httpx.RequestError as error:
        result = {
            "status_code": None,
            "response_time_ms": round(
                (time.perf_counter() - start_time) * 1000, 2
            ),
            "is_success": False,
            "error_message": str(error)
        }

    # Create a database record
    check_record = CheckResult(
        monitor_id=monitor_id,
        status_code=result["status_code"],
        response_time_ms=result["response_time_ms"],
        is_success=result["is_success"],
        error_message=result["error_message"]
    )

    # Save the record in MySQL
    db.add(check_record)
    await db.commit()
    await db.refresh(check_record)

    return result
