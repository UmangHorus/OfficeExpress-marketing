"use client";
import { useEffect, useState } from "react";

export default function MovedMessage() {
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // Get current URL and extract subdomain
    const currentHostname = window.location.hostname;
    setCurrentUrl(currentHostname);
    
    // Extract subdomain (the part before the first dot)
    const domainParts = currentHostname.split('.');
    let subdomain = "www"; // Default fallback
    
    if (domainParts.length > 2) {
      // For subdomains like marketing.corpteaser.net
      subdomain = domainParts[0];
    } else if (domainParts.length === 2 && domainParts[0] !== "www") {
      // For domains like corpteaser.net (no subdomain)
      subdomain = "www";
    }
    
    // Construct the new URL
    const newUrl = `https://${subdomain}.hofficeexpress.com`;
    setNewWebsiteUrl(newUrl);
  }, []);
  
  return (
    <div style={{ 
      textAlign: "center", 
      padding: "20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#f0f8ff",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        maxWidth: "600px",
        width: "90%"
      }}>
        <div style={{ marginBottom: "25px" }}>
          <h1 style={{ 
            color: "#2c5282", 
            marginBottom: "15px",
            fontSize: "28px",
            fontWeight: "600"
          }}>
            We've Moved to a New Platform!
          </h1>
          <div style={{
            height: "4px",
            width: "60px",
            backgroundColor: "#4299e1",
            margin: "0 auto",
            borderRadius: "2px"
          }}></div>
        </div>
        
        <p style={{ 
          color: "#4a5568", 
          fontSize: "18px", 
          lineHeight: "1.6",
          marginBottom: "10px"
        }}>
          The application at <strong>{currentUrl}</strong> has been moved to:
        </p>
        
        <div style={{
          backgroundColor: "#ebf5ff",
          padding: "15px",
          borderRadius: "8px",
          margin: "20px 0",
          border: "1px dashed #90cdf4"
        }}>
          <a 
            href={newWebsiteUrl} 
            style={{
              color: "#2b6cb0",
              fontWeight: "bold",
              fontSize: "20px",
              textDecoration: "none",
              wordBreak: "break-all"
            }}
            onMouseOver={(e) => e.target.style.textDecoration = "underline"}
            onMouseOut={(e) => e.target.style.textDecoration = "none"}
          >
            {newWebsiteUrl || "Loading..."}
          </a>
        </div>
        
        <p style={{ 
          color: "#718096", 
          margin: "25px 0",
          fontSize: "16px"
        }}>
          Click the button below to continue to the new platform.
        </p>
        
        <div style={{ marginTop: "30px" }}>
          <button 
            onClick={() => window.location.href = newWebsiteUrl}
            style={{
              padding: "12px 30px",
              backgroundColor: "#4299e1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 5px rgba(66, 153, 225, 0.3)"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#3182ce";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 8px rgba(66, 153, 225, 0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#4299e1";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 2px 5px rgba(66, 153, 225, 0.3)";
            }}
          >
            Continue to New Platform
          </button>
        </div>
      </div>
    </div>
  );
}