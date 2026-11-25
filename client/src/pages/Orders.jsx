// import CSS here
import { Link } from 'react-router-dom';

const Orders = () => {
    return (
        <>
        <h1>
            Order History Page
        </h1>
        <p><Link to="/orders/1">Test order (temporary)</Link></p>
        </>
    )
}

export default Orders;