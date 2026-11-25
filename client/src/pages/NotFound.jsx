// import CSS here
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <>
            <h1>
                Page not found
            </h1>
            <p>The page you're looking for does not exist.</p>
            <p><Link to="/">Back to home</Link></p>
        </>
    )
}

export default NotFound;