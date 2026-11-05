
import asyncio

from database import AsyncSessionLocal, engine
from services.checker import check_endpoint


async def main():
    monitor_id = "52bb5eb1-c3cd-476e-abf3-089e61f9adce"

    try:
        async with AsyncSessionLocal() as db:
            result = await check_endpoint(
                url="https://jsonplaceholder.typicode.com/posts/1",
                method="GET",
                timeout_seconds=10,
                monitor_id=monitor_id,
                db=db
            )

            print("API Check Result:")
            print(result)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
