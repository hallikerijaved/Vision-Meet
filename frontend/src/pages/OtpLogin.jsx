import React, { useState } from "react";
import axios from "axios";

function OtpLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [msg, setMsg] = useState("");

  const sendOtp = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001/api"}/auth/send-otp`, { email });
      setShowOtp(true);
      setMsg("OTP sent to email!");
    } catch (err) {
      setMsg("Error sending OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001/api"}/auth/verify-otp`, {
        email,
        otp
      });

      setMsg(res.data.message + " Welcome!");
    } catch (err) {
      setMsg("Invalid OTP");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>OTP Login / Registration</h2>

      <input
        type="email"
        placeholder="Enter Email"
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      {!showOtp ? (
        <button onClick={sendOtp} style={{ width: "100%", padding: 10 }}>
          Send OTP
        </button>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            onChange={(e) => setOtp(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 10 }}
          />
          <button
            onClick={verifyOtp}
            style={{ width: "100%", padding: 10, marginTop: 10 }}
          >
            Verify OTP
          </button>
        </>
      )}

      <p>{msg}</p>
    </div>
  );
}

export default OtpLogin;
