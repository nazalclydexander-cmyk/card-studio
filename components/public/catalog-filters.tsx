import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicCategory } from "@/lib/public-catalog-shared";
import { cn } from "@/lib/utils";

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
  const hasActiveFilters = Boolean(selectedCategorySlug || searchQuery);

  return (
    <section
      id="category-filter"
      className="space-y-5 rounded-[calc(var(--site-card-radius)+0.2rem)] border bg-[color:var(--site-surface)] p-5 shadow-sm sm:p-6"
      style={{
        borderColor: "color-mix(in srgb, var(--site-text) 8%, transparent)",
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form
          action="/products"
          className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <div className="space-y-2 sm:col-span-3 lg:col-span-1">
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

          {hasActiveFilters ? (
            <Button asChild variant="outline" className="h-11 px-5">
              <Link href="/products">Reset</Link>
            </Button>
          ) : null}
        </form>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Browse by category</p>
          {selectedCategorySlug ? (
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--site-muted)" }}>
              Filter active
            </p>
          ) : null}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link
            href={buildProductsHref({ query: searchQuery || null })}
            aria-current={!selectedCategorySlug ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !selectedCategorySlug
                ? "text-white"
                : "hover:bg-black/5",
            )}
            style={{
              borderRadius: "var(--site-button-radius)",
              borderColor: !selectedCategorySlug
                ? "transparent"
                : "color-mix(in srgb, var(--site-text) 10%, transparent)",
              backgroundColor: !selectedCategorySlug
                ? "var(--site-primary)"
                : "transparent",
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-white" : "hover:bg-black/5",
                )}
                style={{
                  borderRadius: "var(--site-button-radius)",
                  borderColor: active
                    ? "transparent"
                    : "color-mix(in srgb, var(--site-text) 10%, transparent)",
                  backgroundColor: active ? "var(--site-primary)" : "transparent",
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
