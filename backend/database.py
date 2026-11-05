import os

from dotenv import load_dotenv
from sqlalchemy import URL
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession
)

load_dotenv()

DATABASE_URL = URL.create(
    drivername="mysql+aiomysql",
    username="root",
    password=os.getenv("DB_PASSWORD"),
    host="localhost",
    port=3306,
    database="sentinel_db"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session