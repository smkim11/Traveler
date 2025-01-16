from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from amadeus import Client, ResponseError
from openai import OpenAI

client = OpenAI(api_key="sk-LVhcLH9WYe1I9OJvqOQ97LTL4bzrwqQL4tCxsyyLubT3BlbkFJDVdeb7y-vGasTBVN1R2I7lVxdVnPs9i7qLquzZVioA")  # 실제 API 키로 대체하세요
import logging
import re

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 프론트엔드 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite 데이터베이스 설정
DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 유저 모델 정의
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

# 데이터베이스 초기화
Base.metadata.create_all(bind=engine)

# 의존성: 데이터베이스 세션 생성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic 모델 정의
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# 비밀번호 해시를 위한 유틸리티 함수
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Amadeus 및 OpenAI API 키 설정
amadeus = Client(
    client_id="fe3si2AT8QusGNTAxDgxA7WXerqJc5b5",
    client_secret="0RVDy7zAUaqrCl55"
)

# 항공사 코드와 이름 매핑
airline_names = {
    "7C": "제주항공",
    "TW": "티웨이항공",
    "KE": "대한항공",
    "LJ": "진에어",
    "BX": "에어부산",
    "ZE": "이스타항공",
    "RS": "에어서울",
    "OZ": "아시아나항공",
    "AA": "아메리칸항공",
    "DL": "Delta Air Lines",
    "UA": "United Airlines",
    "BA": "British Airways",
    "AF": "에어 프랑스",
    "JL": "일본항공",
    "NH": "전일본공수",
    "JW": "바닐라에어",
    "MM": "피치항공",
    "NQ": "에어재팬"
    # 여기에 필요한 항공사 코드와 이름을 추가하세요
}

# 공항 코드와 이름 매핑
airport_names = {
    "ICN": "인천국제공항(ICN)",
    "KIX": "간사이국제공항(KIX)",
    "NRT": "나리타국제공항(NRT)",
    "LAX": "로스앤젤러스국제공항(LAX)",
    "JFK": "존에프캐너디국제공항(JFK)",
    "HND": "하네다공항(HND)",
    "CDG": "Charles de Gaulle Airport",
    # 필요한 공항 코드와 이름을 추가하세요
}

# 항공편 검색 요청 형식을 정의하는 Pydantic 모델
class FlightSearchRequest(BaseModel):
    originLocationCode: str
    destinationLocationCode: str
    departureDate: str
    returnDate: str = None
    adults: int = 1

    @validator('departureDate')
    def validate_date(cls, v):
        if not re.match(r'\d{4}-\d{2}-\d{2}', v):
            raise ValueError('departureDate는 YYYY-MM-DD 형식이어야 합니다.')
        return v

class ChatRequest(BaseModel):
    message: str
    flightData: list = None

messages = [
    {"role": "system", "content": "You are a helpful Travel Guide, and only use Korean."}
]

@app.post("/flights")
async def search_flights(request: FlightSearchRequest):
    try:
        logger.info(f"Received flight search request: {request.dict()}")

        search_params = {
            "originLocationCode": request.originLocationCode,
            "destinationLocationCode": request.destinationLocationCode,
            "departureDate": request.departureDate,
            "adults": request.adults,
        }

        if request.returnDate:
            search_params["returnDate"] = request.returnDate

        response = amadeus.shopping.flight_offers_search.get(**search_params)

        if not response.data:
            logger.info("No flights found for the given criteria.")
            return {"flight_data": [], "chatbot_message": "해당 조건에 맞는 항공편이 없습니다."}

        # 각 항공편에 대해 편도와 왕복 모두 데이터를 수집
        flight_data = []
        for flight in response.data[:20]:  # 첫 20개의 항공편만 처리
            itineraries_info = []
            for itinerary in flight["itineraries"]:
                segments = itinerary["segments"]
                for segment in segments:
                    origin_code = segment["departure"]["iataCode"]
                    destination_code = segment["arrival"]["iataCode"]
                    carrier_code = segment["carrierCode"]

                    origin_name = airport_names.get(origin_code, origin_code)  # 출발지 이름 변환
                    destination_name = airport_names.get(destination_code, destination_code)  # 도착지 이름 변환
                    carrier_name = airline_names.get(carrier_code, carrier_code)  # 항공사 이름 변환

                    cabin_class = segment.get("cabin", "정보 없음")
                    itineraries_info.append({
                        "origin": origin_name,
                        "destination": destination_name,
                        "carrier": carrier_name,
                        "cabin_class": cabin_class,
                        "price": flight["price"]["total"]
                    })
            flight_data.append(itineraries_info)

        logger.info(f"Amadeus API response: {flight_data}")
        return {"flight_data": flight_data, "chatbot_message": f"{len(response.data)}개의 항공편을 찾았습니다."}

    except ResponseError as error:
        logger.error(f"Amadeus API Error: {error}\nError Message: {error.response.result}")
        raise HTTPException(status_code=500, detail="Amadeus API Error")
    except HTTPException as http_error:
        logger.error(f"Input validation error: {http_error.detail}")
        raise http_error
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Unexpected Server Error")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_message = request.message
    flight_data = request.flightData
    logger.info(f"User message: {user_message}")
    logger.info(f"Flight data received: {flight_data}")

    messages.append({"role": "user", "content": user_message})

    if flight_data:
        # flight_data를 요약해 시스템 메시지로 추가
        for i, itineraries in enumerate(flight_data):
            for j, flight in enumerate(itineraries):
                leg_text = "가는 편" if j == 0 else "오는 편"
                flight_summary = (
                    f"항공편 {i + 1} - {leg_text}: "
                    f"항공사 - {flight['carrier']}, "
                    f"출발지 - {flight['origin']}, "
                    f"도착지 - {flight['destination']}, "
                    f"좌석 등급 - {flight['cabin_class']}, "
                    f"가격 - {flight['price']}"
                )
                messages.append({"role": "system", "content": flight_summary})

    try:
        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages)

        assistant_message = response.choices[0].message.content
        messages.append({"role": "assistant", "content": assistant_message})
        return {"response": assistant_message}
    except Exception as e:
        logger.error(f"Error in chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/signup")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"username": new_user.username}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    return {"message": "Login successful"}