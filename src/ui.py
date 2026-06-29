from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

from src.config import TEMPLATES_PATH, __version__

router = APIRouter(tags=["UI"])
templates = Jinja2Templates(directory=TEMPLATES_PATH)


@router.get("/")
def serve_dashboard(request: Request):
    return templates.TemplateResponse(
        request=request, name="index.html", context={"app_version": __version__}
    )
