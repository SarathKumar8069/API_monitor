
import asyncio
from sqlalchemy import text
from database import engine


async def test_connection():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT DATABASE(), VERSION()")
            )

            print("\nMySQL connected successfully!")

            for row in result:
                print("Database:", row[0])
                print("MySQL Version:", row[1])

    except Exception as error:
        print("Database connection failed:", error)

    finally:
        await engine.dispose()


asyncio.run(test_connection())
