from fastapi import HTTPException, status, Response, Depends
from core.security import create_access_token, hash_password, verify_password
from models.user_model import User
from schemas.auth import LoginRequest, RegisterRequest


async def register(data: RegisterRequest, response: Response):
    existing_user = await User.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
    )
    await user.insert()

    token = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )

    return {
        "message": "Registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "project_list": user.project_list,
        },
    }


async def login(data: LoginRequest, response: Response):
    user = await User.find_one({"email": data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    valid_password = verify_password(data.password, user.password_hash)
    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "project_list": user.project_list,
        },
    }


async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
    return {
        "message": "Logout successful"
    }


async def get_me(current_user: User):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "project_list": current_user.project_list,
    }