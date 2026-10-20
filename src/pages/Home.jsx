export default function Home() {
    return (
        <div className="home">
            <h1>Welcome to the Home Page</h1>
            <p>This is the home page of the application.</p>
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