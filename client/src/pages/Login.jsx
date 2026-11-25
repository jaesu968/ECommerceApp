// import CSS here
import { Link } from 'react-router-dom';

const Login = () => {
    return (
        <>
        <h1>
            Login Page
        </h1>
        <p>New here? <Link to="/register">Create an account</Link></p>
        </>
    )
}

export default Login;