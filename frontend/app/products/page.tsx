import Link from "next/link";

const products = [
  {
    name: "Dawn breakfast bowl",
    category: "Tableware",
    price: "$42",
    description: "A generous, hand-thrown bowl for slow mornings and warm rituals.",
    color: "#d59a72",
  },
  {
    name: "Quiet day mug",
    category: "Mugs",
    price: "$28",
    description: "A comfortable everyday mug with a soft glaze and an easy handle.",
    color: "#aeb39a",
  },
  {
    name: "Field vase",
    category: "Decor",
    price: "$58",
    description: "A small sculptural vase made to hold a few stems or stand alone.",
    color: "#c5a889",
  },
];

export default function ProductsPage() {
  return (
    <main className="products-page">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Hakujina home">
          <span className="wordmark-mark" aria-hidden="true">h</span>
          hakujina
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link className="button button-small" href="/products">Shop pieces</Link>
        </nav>
      </header>

      <section className="products-intro">
        <p className="eyebrow"><span className="eyebrow-dot" /> The current collection</p>
        <h1>Made for everyday rituals.</h1>
        <p>Small-batch pottery, shaped slowly and ready to become part of your home.</p>
      </section>

      <section className="product-grid" aria-label="Products">
        {products.map((product) => (
          <article className="product-card" key={product.name}>
            <div className="product-art" style={{ backgroundColor: product.color }}>
              <span aria-hidden="true">h</span>
            </div>
            <div className="product-card-body">
              <div className="product-card-heading">
                <div>
                  <p className="product-category">{product.category}</p>
                  <h2>{product.name}</h2>
                </div>
                <strong>{product.price}</strong>
              </div>
              <p>{product.description}</p>
              <button className="button button-outline button-full" type="button">View piece <span aria-hidden="true">↗</span></button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
