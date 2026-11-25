// Header component

const Header = () => {
    return (
        <header className="header">
            <p>The Physical CD Store</p>
            <nav aria-label="Main">
                <ul>
                    <li>Shop</li>
                    <li>Orders</li>
                </ul>
            </nav>
            <input aria-label="search" type="search" disabled placeholder="Search products"></input>
            <nav aria-label="Account">
                <ul>
                    <li>Log In</li>
                    <li>Cart (0)</li>
                </ul>
            </nav>
        </header>
    )
}

export default Header;