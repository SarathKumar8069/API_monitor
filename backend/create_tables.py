import asyncio

from database import engine
from models import Base


async def create_tables():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    print("Database tables created successfully!")


async def main():
    await create_tables()
    await engine.dispose()


asyncio.run(main())