"use client";

import React, { useCallback, useEffect, useState } from "react";
import { catalogApi, type Category, type Product } from "@/lib/api";
import { ProductCard } from "@/components/product-card";

// Fallback catalog pieces if backend has no products seeded yet
const FALLBACK_CATALOG: Product[] = [
  {
    id: 1,
    name: "Stone Vase",
    slug: "stone-vase",
    price: "1850",
    stock: 5,
    in_stock: true,
    primary_image: { id: 1, image: "/images/stone-vase.jpg", alt_text: "Stone Vase" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "Hand-thrown stoneware vase with raw stone texture and soft mineral glaze.",
  },
  {
    id: 2,
    name: "Pedestal Bowl",
    slug: "pedestal-bowl",
    price: "1600",
    stock: 4,
    in_stock: true,
    primary_image: { id: 2, image: "/images/pedestal-bowl.jpg", alt_text: "Pedestal Bowl" },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description: "Flared footed serving bowl shaped from iron-rich terracotta clay.",
  },
  {
    id: 3,
    name: "Handle Jug",
    slug: "handle-jug",
    price: "2100",
    stock: 3,
    in_stock: true,
    primary_image: { id: 3, image: "/images/handle-jug.jpg", alt_text: "Handle Jug" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "Spherical pouring vessel with pulled ceramic loop handle.",
  },
  {
    id: 4,
    name: "Rivulet Vase",
    slug: "rivulet-vase",
    price: "1950",
    stock: 6,
    in_stock: true,
    primary_image: { id: 4, image: "/images/rivulet-vase.jpg", alt_text: "Rivulet Vase" },
    category: { id: 1, name: "Vases & Decor", slug: "vases" },
    description: "Undulating sculpted wave vase in chalk white matte glaze.",
  },
  {
    id: 5,
    name: "Drift Bowl Set",
    slug: "drift-bowl-set",
    price: "2450",
    stock: 2,
    in_stock: true,
    primary_image: { id: 5, image: "/images/drift-bowls.jpg", alt_text: "Drift Bowl Set" },
    category: { id: 2, name: "Tableware", slug: "tableware" },
    description: "Nested pair of breakfast and soup bowls in lilac and beach sand slip.",
  },
  {
    id: 6,
    name: "Hearth Mug",
    slug: "hearth-mug",
    price: "950",
    stock: 8,
    in_stock: true,
    primary_image: { id: 6, image: "/images/hearth-mug.jpg", alt_text: "Hearth Mug" },
    category: { id: 3, name: "Mugs & Cups", slug: "mugs" },
    description: "Two-tone dipped morning mug with an ergonomic ear handle.",
  },
];

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [ordering, setOrdering] = useState<string>("-created_at");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch categories once
  useEffect(() => {
    catalogApi
      .getCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {
        // Fallback default categories if server is not yet seeded
        setCategories([
          { id: 1, name: "Vases & Decor", slug: "vases" },
          { id: 2, name: "Tableware", slug: "tableware" },
          { id: 3, name: "Mugs & Cups", slug: "mugs" },
        ]);
      });
  }, []);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await catalogApi.getProducts({
        category: selectedCategory || undefined,
        search: activeSearch || undefined,
        ordering: ordering || undefined,
        in_stock: inStockOnly ? true : undefined,
        page: currentPage,
      });

      if (res.results && res.results.length > 0) {
        setProducts(res.results);
        setTotalCount(res.count);
      } else if (!selectedCategory && !activeSearch && !inStockOnly) {
        // If first load had empty backend DB, show our sample catalog
        setProducts(FALLBACK_CATALOG);
        setTotalCount(FALLBACK_CATALOG.length);
      } else {
        setProducts([]);
        setTotalCount(0);
      }
    } catch {
      // If error or offline, fallback to sample items
      let filtered = [...FALLBACK_CATALOG];
      if (selectedCategory) {
        filtered = filtered.filter((p) => p.category?.slug === selectedCategory);
      }
      if (activeSearch) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
            p.description?.toLowerCase().includes(activeSearch.toLowerCase()),
        );
      }
      if (inStockOnly) {
        filtered = filtered.filter((p) => p.in_stock);
      }
      setProducts(filtered);
      setTotalCount(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, activeSearch, ordering, inStockOnly, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
    setCurrentPage(1);
  }

  function handleCategoryClick(slug: string) {
    setSelectedCategory((prev) => (prev === slug ? "" : slug));
    setCurrentPage(1);
  }

  function handleResetFilters() {
    setSelectedCategory("");
    setSearchQuery("");
    setActiveSearch("");
    setInStockOnly(false);
    setOrdering("-created_at");
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / 12));

  return (
    <div className="catalog-container">
      {/* Editorial Header */}
      <section className="catalog-hero">
        <p className="eyebrow-line">
          <span className="eyebrow-dot" /> THE COLLECTION
        </p>
        <h1 className="catalog-title">Made for everyday rituals.</h1>
        <p className="catalog-lead">
          Small-batch stoneware and terracotta, thrown on the wheel and
          fired to endure a lifetime of living.
        </p>
      </section>

      {/* Filter and Control Bar */}
      <section className="catalog-controls-bar">
        {/* Category Pills */}
        <div className="category-pills" role="tablist" aria-label="Product Categories">
          <button
            type="button"
            className={`pill-btn ${selectedCategory === "" ? "active" : ""}`}
            onClick={() => handleCategoryClick("")}
          >
            All Pieces
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`pill-btn ${selectedCategory === cat.slug ? "active" : ""}`}
              onClick={() => handleCategoryClick(cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search, Sort, and In-Stock Controls */}
        <div className="catalog-utility-controls">
          <form onSubmit={handleSearchSubmit} className="catalog-search-form">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pieces..."
              className="catalog-search-input"
            />
            <button type="submit" className="catalog-search-submit" aria-label="Submit search">
              🔍
            </button>
          </form>

          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setCurrentPage(1);
              }}
            />
            <span>In stock only</span>
          </label>

          <div className="sort-dropdown-wrap">
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setCurrentPage(1);
              }}
              className="catalog-sort-select"
              aria-label="Sort products by"
            >
              <option value="-created_at">Newest First</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>
      </section>

      {/* Active Filter Indicators */}
      {(selectedCategory || activeSearch || inStockOnly) && (
        <div className="active-filters-row">
          <span>Active filters:</span>
          {selectedCategory && (
            <span className="filter-chip">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button type="button" onClick={() => setSelectedCategory("")}>×</button>
            </span>
          )}
          {activeSearch && (
            <span className="filter-chip">
              Search: &ldquo;{activeSearch}&rdquo;
              <button type="button" onClick={() => { setSearchQuery(""); setActiveSearch(""); }}>×</button>
            </span>
          )}
          {inStockOnly && (
            <span className="filter-chip">
              In Stock
              <button type="button" onClick={() => setInStockOnly(false)}>×</button>
            </span>
          )}
          <button type="button" className="clear-all-link" onClick={handleResetFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="ceramic-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="card-skeleton" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="catalog-empty-state">
          <span className="empty-symbol">𓊈</span>
          <h3>No pieces found</h3>
          <p>We couldn&apos;t find any ceramic pieces matching your current filters.</p>
          <button type="button" className="button button-terracotta" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="ceramic-grid">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={(currentPage - 1) * 12 + idx}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="catalog-pagination">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
