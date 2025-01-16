import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatBot from "../components/ChatBot";

const Flight = () => {
    const location = useLocation();
    
    const {
        originLocationCode = "",
        destinationLocationCode = "",
        departureDate = "",
        returnDate = "",
        adults = 1,
    } = location.state || {};

    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFlights = async () => {
            if (!departureDate) {
                setError("출발 날짜는 필수입니다.");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const body = {
                    originLocationCode,
                    destinationLocationCode,
                    departureDate,
                    returnDate: returnDate || null,
                    adults,
                };

                const response = await fetch("http://localhost:8000/flights", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json();
                if (response.ok) {
                    if (data.flight_data.length === 0) {
                        setError("해당 조건에 맞는 항공편을 찾을 수 없습니다.");
                    } else {
                        setFlights(data.flight_data.slice(0, 10) || []);
                    }
                } else {
                    setError(data.detail || "항공편을 불러오는 중 오류가 발생했습니다.");
                }
            } catch (err) {
                setError("항공편을 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchFlights();
    }, [originLocationCode, destinationLocationCode, departureDate, returnDate, adults]);

    const renderChatBot = () => {
        if (loading) {
            return <ChatBot chatPrompt="항공편 정보를 불러오고 있습니다..." />;
        } else if (error) {
            return <ChatBot chatPrompt={error} />;
        } else if (flights.length > 0) {
            return (
                <ChatBot chatPrompt="항공편 정보를 확인할 수 있습니다." flightData={flights} />
            );
        } else {
            return <ChatBot chatPrompt="항공편을 찾을 수 없습니다." />;
        }
    };

    return (
        <>
            {renderChatBot()}
        </>
    );
};

export default Flight;
