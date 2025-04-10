import React from "react";
import img02 from "../images/bh.jpg";
import img03 from "../images/blackline.png";
import "../SEstyle.css";
import { useState } from "react";
import axios from "axios";

export default function SE() {
  const [name, setName] = useState("");
  const [data, setData] = useState([]);

  async function submit(e) {
    e.preventDefault();

    try {
      const response = await axios.get("http://localhost:5000/search", {
        params: {
          name: name,
        },
      });

      if (response.data === "fail") {
        alert("Failed");
      } else {
        setData(response.data);
      }
      console.log(response);
      console.log(response.data);
    } catch (error) {
      console.error("Error occurred:", error);
      alert("An error occurred while fetching the data.");
    }
  }

  const crawl = async (url) => {
    console.log("crawler clicked");
    if (!url) console.log("url required at Ui");

    await axios.post("http://localhost:5000/crawl", { url });
  };

  return (
    <div className="Body">
      <div className="InnerBody">
        <img src={img02} alt="image" className="blackhole" />

        <form className="form" onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            type="text"
            className="txt"
            placeholder="Search  here..."
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </div>
      <div className="logo">
        <img src={img03} alt="image" className="logoimg" />
      </div>
      <div className="innerbody2">
        <div className="showdata">
          {data ? (
            data.map((e) => (
              <section className="section" key={e._id}>
                <br />
                <h3 id="titless">{e.Title}</h3>
                <a
                  href={e.Url}
                  target="_blank"
                  className="link"
                  onClick={() => crawl(e.Url)}
                >
                  {e.Url}
                </a>
                <p className="desc">{e.Description}</p>
                <p style={{color:"green",fontSize:"larger",fontWeight:"bold"}}>{e.ScanStatus==='safe' ? "Safe link":""}</p>
               
              </section>
            ))
          ) : (
            <p >no data available !!!</p>
          )}
        </div>
      </div>
      <div className="footer">
        <h3 id="copyright">All rights are Reserved || &copy; </h3>
        <div className="foot1">
          <h3>Contact Us</h3>
          <li>Email: www.Blackhole.com</li>
          <li>Phone: +123 456 7890</li>
        </div>
      </div>
    </div>
  );
}
