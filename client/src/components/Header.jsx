// Header component

const Header = () => {
    return (
        <section className="header">
            <p>The Physical CD Store</p>
            <nav aria-label="Main">
                <ul>
                    <li>Shop</li>
                    <li>Albums</li>
                    <li>Artists</li>
                </ul>
            </nav>
            <input aria-label="search" type="search"></input>
            <nav aria-label="Account">
                <ul>
                    <li>Log In</li>
                    <li>Cart (0)</li>
                </ul>
            </nav>
        </section>
    )
}

export default Header;