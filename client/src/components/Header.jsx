// Header component
import { Link, NavLink } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header">
            <p><Link to="/">The Physical CD Store</Link></p>
            <nav aria-label="Main">
                <ul>
                    <li><NavLink to="/products">Shop</NavLink></li>
                    <li><NavLink to="/orders">Orders</NavLink></li>
                </ul>
            </nav>
            <input aria-label="search" type="search" disabled placeholder="Search products"></input>
            <nav aria-label="Account">
                <ul>
                    <li><NavLink to="/login">Log In</NavLink></li>
                    <li><NavLink to="/cart">Cart (0)</NavLink></li>
                </ul>
            </nav>
        </header>
    )
}

export default Header;