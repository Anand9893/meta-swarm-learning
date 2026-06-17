from datetime import UTC, datetime


def start_of_month() -> datetime:
    """Return the first moment of the current month in UTC."""
    now = datetime.now(tz=UTC)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
