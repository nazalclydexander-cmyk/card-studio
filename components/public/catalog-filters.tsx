import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicCategory } from "@/lib/public-catalog-shared";

type CatalogFiltersProps = {
  categories: PublicCategory[];
  selectedCategorySlug: string | null;
  searchQuery: string;
};

function buildProductsHref({
  category,
  query,
}: {
  category?: string | null;
  query?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (category) {
    searchParams.set("category", category);
  }

  if (query) {
    searchParams.set("q", query);
  }

  const suffix = searchParams.toString();
  return suffix ? `/products?${suffix}` : "/products";
}

export function CatalogFilters({
  categories,
  selectedCategorySlug,
  searchQuery,
}: CatalogFiltersProps) {
  return (
    <section
      id="category-filter"
      className="space-y-5 rounded-[calc(var(--site-card-radius)+0.25rem)] border border-black/5 bg-[color:var(--site-surface)] p-5 shadow-sm"
    >
      <form
        action="/products"
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="space-y-2">
          <label htmlFor="catalog-search" className="text-sm font-medium">
            Search designs
          </label>
          <Input
            id="catalog-search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search by name, theme, or style"
            className="h-11"
          />
          {selectedCategorySlug ? (
            <input type="hidden" name="category" value={selectedCategorySlug} />
          ) : null}
        </div>

        <div className="flex items-end gap-3">
          <Button
            type="submit"
            className="h-11 px-5"
            style={{
              backgroundColor: "var(--site-primary)",
              color: "var(--site-surface)",
              borderRadius: "var(--site-button-radius)",
            }}
          >
            Search
          </Button>

          {selectedCategorySlug || searchQuery ? (
            <Button asChild variant="outline" className="h-11 px-5">
              <Link href="/products">Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Browse by category</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildProductsHref({ query: searchQuery || null })}
            className={`rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              !selectedCategorySlug
                ? "border-transparent text-white"
                : "border-black/10 hover:bg-black/5"
            }`}
            style={{
              borderRadius: "var(--site-button-radius)",
              ...(selectedCategorySlug
                ? {}
                : {
                    backgroundColor: "var(--site-primary)",
                  }),
            }}
          >
            All
          </Link>

          {categories.map((category) => {
            const active = selectedCategorySlug === category.slug;

            return (
              <Link
                key={category.id}
                href={buildProductsHref({
                  category: category.slug,
                  query: searchQuery || null,
                })}
                className={`rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-transparent text-white"
                    : "border-black/10 hover:bg-black/5"
                }`}
                style={{
                  borderRadius: "var(--site-button-radius)",
                  ...(active
                    ? {
                        backgroundColor: "var(--site-primary)",
                      }
                    : {}),
                }}
              >
                {category.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
