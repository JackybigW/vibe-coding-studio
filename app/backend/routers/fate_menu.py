import random
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/fate-menu", tags=["fate-menu"])

FOODS = [
    {
        "id": 1,
        "name": "火锅",
        "emoji": "🍲",
        "tagline": "燃烧你的卡路里！麻辣鲜香，人生巅峰！",
    },
    {
        "id": 2,
        "name": "烤肉",
        "emoji": "🥩",
        "tagline": "今天是肉食主义者！烟火气治愈一切。",
    },
    {
        "id": 3,
        "name": "寿司",
        "emoji": "🍣",
        "tagline": "感受日式精致，每一口都是艺术。",
    },
    {
        "id": 4,
        "name": "螺蛳粉",
        "emoji": "🍜",
        "tagline": "全宇宙最香的臭！上瘾警告⚠️",
    },
    {
        "id": 5,
        "name": "麻辣烫",
        "emoji": "🌶️",
        "tagline": "辣到灵魂出窍，快乐加倍！",
    },
    {
        "id": 6,
        "name": "汉堡",
        "emoji": "🍔",
        "tagline": "美式豪爽，一口下去，烦恼全消！",
    },
    {
        "id": 7,
        "name": "披萨",
        "emoji": "🍕",
        "tagline": "圆圆的快乐，分享给全世界！",
    },
    {
        "id": 8,
        "name": "炸鸡",
        "emoji": "🍗",
        "tagline": "今天的罪恶最美味，香脆无罪！",
    },
    {
        "id": 9,
        "name": "兰州拉面",
        "emoji": "🍝",
        "tagline": "一碗面，一段情，人间烟火气。",
    },
    {
        "id": 10,
        "name": "沙县小吃",
        "emoji": "🥟",
        "tagline": "人民的美食！蒸饺+拌面，完美配对！",
    },
]


@router.get("/random")
def get_random_food():
    return random.choice(FOODS)


@router.get("/list")
def list_foods():
    return FOODS
