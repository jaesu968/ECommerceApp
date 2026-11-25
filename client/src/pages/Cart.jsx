// import CSS here
import { Link } from 'react-router-dom';

const Cart = () => {
    return (
        <>
        <h1>
            Cart Page
        </h1>
        <p><Link to="/checkout">Proceed to checkout</Link></p>
        </>
    )
}

export default Cart;