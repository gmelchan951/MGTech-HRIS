"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error boundary:", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#1E3A5F",
      color: "white",
      fontFamily: "sans-serif",
      padding: "20px",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "3rem", margin: "0 0 10px 0", color: "#EF4444" }}>Error</h1>
      <h2 style={{ fontSize: "1.5rem", margin: "0 0 20px 0", fontWeight: "normal" }}>Something went wrong!</h2>
      <p style={{ fontSize: "1rem", margin: "0 0 30px 0", maxWidth: "400px", color: "#E8C96A", lineHeight: "1.5" }}>
        {error.message || "An unexpected error occurred in the compliance application."}
      </p>
      <button
        onClick={() => reset()}
        style={{
          backgroundColor: "#C9A84C",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          fontWeight: "bold",
          fontSize: "0.9rem",
          cursor: "pointer",
          transition: "background-color 0.2s"
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#E8C96A"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#C9A84C"}
      >
        Try Again
      </button>
    </div>
  );
}
