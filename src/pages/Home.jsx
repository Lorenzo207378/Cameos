export default function Home() {
    const highlights = [
        {
            category: "Today",
            title: "A quiet corner of the city",
            text: "Collect small moments, unexpected ideas, and places worth remembering.",
            color: "#14bd14"
        },
        {
            category: "Trending",
            title: "Three ways to reset your routine",
            text: "A short walk, an offline hour, and one conversation without notifications.",
            color: "#f0b429"
        },
        {
            category: "For you",
            title: "Make room for something new",
            text: "Your next favorite discovery might be hiding just outside your usual path.",
            color: "#8b7cff"
        }
    ];

    const activities = [
        ["09:15", "Morning pages", "Write down one thought before checking your phone."],
        ["12:40", "Lunch outside", "Find a sunny spot and take a proper break."],
        ["18:30", "Evening walk", "Notice five details you would normally pass by."],
        ["21:00", "Slow down", "Save the day and leave tomorrow for tomorrow."]
    ];

    return (
        <div className="home container-fluid px-3 px-md-4 py-4 pb-5">
            <section className="p-4 p-md-5 rounded-4 mb-4"
                style={{ background: "linear-gradient(135deg, #0a5d0a 0%, #173b25 55%, #262732 100%)" }}>
                <div className="row align-items-end g-4">
                    <div className="col-lg-8">
                        <p className="text-uppercase small fw-bold mb-2" style={{ color: "#b8ffb8", letterSpacing: "0.14em" }}>
                            Your daily mix
                        </p>
                        <h1 className="display-4 fw-bold text-white mb-3">Good things start small.</h1>
                        <p className="lead text-white-50 mb-0">
                            A hand-picked space for ideas, plans, and the little details that make today yours.
                        </p>
                    </div>
                    <div className="col-lg-4">
                        <div className="bg-dark bg-opacity-50 rounded-4 p-3 text-white">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="small text-white-50">Daily progress</span>
                                <span className="fw-bold">68%</span>
                            </div>
                            <div className="progress bg-secondary" style={{ height: "8px" }}>
                                <div className="progress-bar bg-success" style={{ width: "68%" }} />
                            </div>
                            <p className="small text-white-50 mt-3 mb-0">Two more moments to complete your day.</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="d-flex justify-content-between align-items-end mb-3">
                <div>
                    <p className="text-success text-uppercase small fw-bold mb-1">Explore</p>
                    <h2 className="h3 text-white mb-0">A little inspiration</h2>
                </div>
                <button type="button" className="btn btn-outline-light btn-sm rounded-pill">View all</button>
            </div>

            <div className="row g-3 mb-5">
                {highlights.map((highlight) => (
                    <div className="col-md-4" key={highlight.title}>
                        <article className="h-100 rounded-4 p-4 text-white"
                            style={{ backgroundColor: "#262732", borderTop: `4px solid ${highlight.color}` }}>
                            <p className="small text-uppercase fw-bold mb-4" style={{ color: highlight.color }}>
                                {highlight.category}
                            </p>
                            <h3 className="h5">{highlight.title}</h3>
                            <p className="text-white-50 mb-4">{highlight.text}</p>
                            <button type="button" className="btn btn-sm btn-link text-white p-0 text-decoration-none">
                                Read more
                            </button>
                        </article>
                    </div>
                ))}
            </div>

            <div className="row g-4 mb-5">
                <section className="col-lg-7">
                    <div className="rounded-4 p-4 h-100" style={{ backgroundColor: "#262732" }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <p className="text-success text-uppercase small fw-bold mb-1">Your rhythm</p>
                                <h2 className="h4 text-white mb-0">Today's plan</h2>
                            </div>
                            <span className="badge rounded-pill text-bg-success">4 moments</span>
                        </div>
                        {activities.map(([time, title, text], index) => (
                            <div className="d-flex gap-3 mb-4" key={time}>
                                <div className="text-success fw-bold small pt-1" style={{ minWidth: "45px" }}>{time}</div>
                                <div className="border-start border-success ps-3">
                                    <h3 className="h6 text-white mb-1">{title}</h3>
                                    <p className="small text-white-50 mb-0">{text}</p>
                                </div>
                                {index === 0 && <span className="badge rounded-pill text-bg-warning ms-auto align-self-start">Next</span>}
                            </div>
                        ))}
                    </div>
                </section>
                <section className="col-lg-5">
                    <div className="rounded-4 p-4 h-100 text-white"
                        style={{ background: "linear-gradient(160deg, #302d5c, #262732)" }}>
                        <p className="text-uppercase small fw-bold text-info mb-4">Quick note</p>
                        <h2 className="h3 mb-3">What would make today feel lighter?</h2>
                        <p className="text-white-50">Capture an idea, a reminder, or a tiny win before it disappears.</p>
                        <textarea className="form-control border-0 mb-3" rows="4" placeholder="Write something..." />
                        <button type="button" className="btn btn-light rounded-pill px-4">Save note</button>
                    </div>
                </section>
            </div>

            <section className="rounded-4 p-4 p-md-5 mb-4" style={{ backgroundColor: "#262732" }}>
                <div className="row align-items-center g-4">
                    <div className="col-md-8">
                        <p className="text-warning text-uppercase small fw-bold mb-2">Coming soon</p>
                        <h2 className="h3 text-white">Build a collection that feels like you.</h2>
                        <p className="text-white-50 mb-0">
                            Save favorite discoveries and return to them whenever you need a spark.
                        </p>
                    </div>
                    <div className="col-md-4 text-md-end">
                        <button type="button" className="btn btn-success rounded-pill px-4">Start collecting</button>
                    </div>
                </div>
            </section>
        </div>
    )
}
/*
// eslint-disable-next-line no-unused-vars
    const handleGoogleLogout = async () => {
        setAuthError("");
        setAuthMessage("");
        try {
            await logout();
            setNeedsUsername(false);
            setAuthMessage("Logged out successfully.");
        } catch (error) {
            setAuthError(error.message || "Error during logout.");
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleDeleteProfile = async () => {
        setAuthError("");
        setAuthMessage("");
        try {
            await deleteUserProfile();
            setNeedsUsername(false);
            setAuthMessage("Profile deleted successfully.");
        } catch (error) {
            setAuthError(error.message || "Error deleting profile.");
        }
    };
 */