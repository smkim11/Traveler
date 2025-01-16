import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import '../styles/hero_section.css';
import Loader from "./Loader";

const Hero_Section = () => {
    const navigation = useNavigate();
    const [travelDetails, setTravelDetails] = useState({
        from: '',
        to: '',
        people: '',
        travel_date: '',
        return_date: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!travelDetails.travel_date) {
            setError("출발 날짜는 필수입니다.");
            setLoading(false);
            return;
        }

        const requestOptions = {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ 
                originLocationCode: travelDetails.from, 
                destinationLocationCode: travelDetails.to, 
                departureDate: travelDetails.travel_date, 
                returnDate: travelDetails.return_date || null, 
                adults: travelDetails.people || 1 
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'accept': 'application/json'
            }
        };

        fetch("http://127.0.0.1:8000/flights", requestOptions)
            .then(response => response.json())
            .then(response => {
                console.log("Flight Data:", response);
                setLoading(false);
                navigation('/flight', { state: { originLocationCode: travelDetails.from, destinationLocationCode: travelDetails.to, departureDate: travelDetails.travel_date, returnDate: travelDetails.return_date, adults: travelDetails.people || 1 } });
            })
            .catch(error => {
                console.log('error', error);
                setLoading(false);
                setError("오류가 발생했습니다.");
            });
    };

    return (
        <React.Fragment>
            {loading && <Loader />}
            <div className="hero_section">
                <div className="hero_text">
                    <h1>어디로 가고 싶으신가요?</h1>
                    <p>목적지에서 방문하기 가장 좋은 장소와 할 일을 찾아보세요.</p>
                </div>
                <div className="hero_form">
                    <div class="modal">
                        <form class="form">
                            <div className="form-header">
                                <h2>어디로 가시나요?</h2>
                            </div>
                            <div class="credit-card-info--form">
                                <div className="split">
                                    <div class="input_container">
                                        <label for="traveller-destination" className="input_label">출발</label>
                                        <input id="traveller-destination" className="input_field" type="text" name="input-name" placeholder="출발지" value={travelDetails.from} onChange={(e) => setTravelDetails({ ...travelDetails, from: e.target.value })} required />
                                    </div>
                                    <div class="input_container">
                                        <label for="traveller-destination" className="input_label">도착</label>
                                        <input id="traveller-destination" className="input_field" type="text" name="input-name" placeholder="도착지" value={travelDetails.to} onChange={(e) => setTravelDetails({ ...travelDetails, to: e.target.value })} required />
                                    </div>
                                </div>
                                <div class="input_container">
                                    <label for="Number-of-people" class="input_label">인원</label>
                                    <input id="Number-of-people" class="input_field" type="number" name="input-name" placeholder="인원수 " value={travelDetails.people} onChange={(e) => setTravelDetails({ ...travelDetails, people: e.target.value })} required />
                                </div>
                                <div className="split">
                                    <div class="input_container">
                                        <label for="Number-of-days" class="input_label">출발 일자</label>
                                        <input id="Number-of-days" class="input_field" type="date" name="input-name" placeholder="2023-04-20" value={travelDetails.travel_date} onChange={(e) => setTravelDetails({ ...travelDetails, travel_date: e.target.value })} required />
                                    </div>
                                    <div class="input_container">
                                        <label for="Number-of-days" class="input_label">도착 일자</label>
                                        <input id="Number-of-days" class="input_field" type="date" name="input-name" placeholder="2023-04-20" value={travelDetails.return_date} onChange={(e) => setTravelDetails({ ...travelDetails, return_date: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                            <button class="purchase--btn" onClick={handleSubmit}>검색</button>
                        </form>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default Hero_Section;
