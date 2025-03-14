import { useEffect, useState } from "react";

export function Orb() {
    const [data, setData] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000")
            .then((res) => res.json())
            .then((data) => setData(data.message))
            .catch((err) => console.error(err));
    }, []);


    return (
        <div>{data || "Loading..."}</div>
    );
}