// import CSS here
import { Link } from 'react-router-dom';

const Register = () => {
    return (
        <>
        <h1>
            Registration Page
        </h1>
        <p>Already have an account? <Link to="/login">Log in</Link></p>
        </>
    )
}

export default Register;