import os
import shutil
import tempfile
import unittest
from pathlib import Path

_TEST_ROOT = Path(tempfile.gettempdir()) / "astralnova_route_registration_r1"
if _TEST_ROOT.exists():
    shutil.rmtree(_TEST_ROOT, ignore_errors=True)
(_TEST_ROOT / "data").mkdir(parents=True, exist_ok=True)
(_TEST_ROOT / "uploads").mkdir(parents=True, exist_ok=True)
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.main import create_application  # noqa: E402


class RouteRegistrationTests(unittest.TestCase):
    def test_recent_integration_routes_are_registered(self) -> None:
        app = create_application()

        def has_route(path: str, method: str) -> bool:
            return any(
                getattr(route, "path", None) == path and method in getattr(route, "methods", set())
                for route in app.routes
            )

        self.assertTrue(has_route("/books/{book_id}/translation-jobs", "POST"))
        self.assertTrue(has_route("/translation-jobs/{job_id}", "GET"))
        self.assertTrue(has_route("/translation-jobs/{job_id}/cancel", "POST"))
        self.assertTrue(has_route("/backup/export", "GET"))
        self.assertTrue(has_route("/import/url/preview", "POST"))


if __name__ == "__main__":
    unittest.main()
