import React, { useState, useEffect, useRef } from "react";
import Loader from "./Loader";
import '../styles/chatBot.css';

const ChatBot = ({ chatPrompt, flightData }) => {
    const [loading, setLoading] = useState(false);
    const [replies, setReplies] = useState([]);
    const [userMessage, setUserMessage] = useState('');
    const chatWindowRef = useRef(null);

    useEffect(() => {
        if (chatPrompt) {
            setReplies(prevReplies => [...prevReplies, { content: chatPrompt, type: 'chatbot' }]);
        }

        if (flightData && flightData.length > 0) {
            const flightInfo = flightData.map((itineraries, flightIndex) => {
                return itineraries.map((flight, itineraryIndex) => {
                    const legText = itineraryIndex === 0 ? "가는 편" : "오는 편";
                    const originLocationCode = flight.origin;
                    const destinationLocationCode = flight.destination;
                    const carrierCode = flight.carrier;
                    const cabinClass = flight.cabin_class || "정보 없음";
                    const price = flight.price;

                    return {
                        content: `항공편 ${flightIndex + 1} - ${legText}: 항공사 - ${carrierCode}, 출발지 - ${originLocationCode}, 도착지 - ${destinationLocationCode}, 좌석 등급 - ${cabinClass}, 가격 - ${price}`,
                        type: 'flight'
                    };
                });
            }).flat();
            setReplies(prevReplies => [...prevReplies, ...flightInfo]);
        }
    }, [chatPrompt, flightData]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [replies]);

    const fetchAdditionalFlights = async () => {
        try {
            setLoading(true);
            const response = await fetch("http://localhost:8000/flights", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // 필요한 검색 조건들을 다시 넣어줌
                })
            });

            if (response.ok) {
                const data = await response.json();
                const additionalFlightInfo = data.flight_data.map((itineraries, flightIndex) => {
                    return itineraries.map((flight, itineraryIndex) => {
                        const legText = itineraryIndex === 0 ? "가는 편" : "오는 편";
                        const originLocationCode = flight.origin;
                        const destinationLocationCode = flight.destination;
                        const carrierCode = flight.carrier;
                        const cabinClass = flight.cabin_class || "정보 없음";
                        const price = flight.price;

                        return {
                            content: `추가 항공편 ${flightIndex + 1} - ${legText}: 항공사 - ${carrierCode}, 출발지 - ${originLocationCode}, 도착지 - ${destinationLocationCode}, 좌석 등급 - ${cabinClass}, 가격 - ${price}`,
                            type: 'flight'
                        };
                    });
                }).flat();
                setReplies(prevReplies => [...prevReplies, ...additionalFlightInfo]);
            }
        } catch (error) {
            console.error('Error fetching additional flights:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!userMessage.trim()) return;

        setLoading(true);
        setReplies([...replies, { content: userMessage, type: 'user' }]);
        setUserMessage('');

        if (userMessage.includes("20개 더")) {
            await fetchAdditionalFlights();
            return;
        }

        const messagesWithFlightData = [
            { role: "system", content: "You are a helpful Travel Guide, and only use Korean." },
            ...flightData.map((itineraries, flightIndex) => {
                return itineraries.map((flight, itineraryIndex) => {
                    const legText = itineraryIndex === 0 ? "가는 편" : "오는 편";
                    return {
                        role: "system",
                        content: `항공편 ${flightIndex + 1} - ${legText}: 항공사 - ${flight.carrier}, 출발지 - ${flight.origin}, 도착지 - ${flight.destination}, 좌석 등급 - ${flight.cabin_class || "정보 없음"}, 가격 - ${flight.price}`
                    };
                });
            }).flat(),
            { role: "user", content: userMessage }
        ];

        try {
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    flightData: flightData
                })
            });

            if (!response.ok) {
                console.error('API response error:', response.status, response.statusText);
                setReplies(prevReplies => [...prevReplies, { content: "API 요청에 실패했습니다. 상태 코드: " + response.status, type: 'chatbot' }]);
                return;
            }

            const result = await response.json();
            const assistantMessage = result.response;
            setReplies(prevReplies => [...prevReplies, { content: assistantMessage, type: 'chatbot' }]);
        } catch (error) {
            console.error('Error:', error);
            setReplies(prevReplies => [...prevReplies, { content: "문제가 발생했습니다. 다시 시도해 주세요.", type: 'chatbot' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <Loader />}
            <div className="card">
                <div className="chat-header">ChatBot</div>
                <div className="chat-window" ref={chatWindowRef}>
                    <ul className="message-list">
                        {replies.map((reply, index) => (
                            <li
                                key={index}
                                className={`message ${reply.type === 'user' ? 'user-message' : 'bot-message'}`}
                            >
                                <div className="message-body">
                                    <pre>{reply.content}</pre>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        className="message-input"
                        placeholder="메시지"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                    />
                    <button className="ui-btn" onClick={handleSubmit}>
                        <span>입력</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default ChatBot;
