from fastapi import APIRouter, Depends, Response, status
from dependencies.auth import get_current_user
from schemas.auth import LoginRequest, RegisterRequest
from controllers.user_controller import register, login, logout, get_me
from models.user_model import User


router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_route(data: RegisterRequest, response: Response):
    return await register(data, response)


@router.post("/login")
async def login_route(data: LoginRequest, response: Response):
    return await login(data, response)


@router.post("/logout")
async def logout_route(response: Response):
    return await logout(response)


@router.get("/me")
async def me_route(current_user: User = Depends(get_current_user)):
    return await get_me(current_user)