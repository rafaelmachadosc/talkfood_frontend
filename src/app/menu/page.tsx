"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { fetchPublicAll } from "@/core/http/public-api-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, X, Receipt } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { MenuCart } from "@/components/menu/menu-cart";
import { MenuCheckout } from "@/components/menu/menu-checkout";
import { MenuSuccess } from "@/components/menu/menu-success";
import { Logo } from "@/components/logo";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function MenuPage() {
  const establishmentInfo = {
    name: "BARI CAFFE",
    category: "Cafeteria",
    status: "Fechada",
    addressNote: "Selecione um endereço para entrega",
    minOrder: "R$ 25,00",
  };
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | undefined>();
  const [orderTable, setOrderTable] = useState<number | undefined>();
  const [orderPhone, setOrderPhone] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [savedTable, setSavedTable] = useState<number | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);

  // Carregar mesa e telefone salvos do localStorage
  useEffect(() => {
    console.log("API:", process.env.NEXT_PUBLIC_API_URL);
    if (typeof window !== "undefined") {
      const savedTableStr = localStorage.getItem("comanda_table");
      const savedPhoneStr = localStorage.getItem("comanda_phone");
      
      if (savedTableStr && savedPhoneStr) {
        setSavedTable(Number(savedTableStr));
        setSavedPhone(savedPhoneStr);
      }
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [productsData] = await fetchPublicAll<[Product[]]>([
          "/api/public/products",
        ]);

        const normalizedProducts = Array.isArray(productsData)
          ? productsData
          : ((productsData as unknown as { data?: Product[] })?.data ?? []);

        setProducts(normalizedProducts);
        const uniqueCategories = Array.from(
          new Set(
            (normalizedProducts || [])
              .map((p) => (p.category || "").trim())
              .filter((category) => category !== "")
          )
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCategories(uniqueCategories);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((product) => {
      const category = (product.category || "").trim() || "Sem categoria";
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(product);
    });
    return map;
  }, [products]);

  const sections = useMemo(() => {
    const ordered = categories.length ? categories : Array.from(productsByCategory.keys());
    return ordered.map((category) => ({
      category,
      products: productsByCategory.get(category) || [],
    })).filter(section => section.products.length > 0);
  }, [categories, productsByCategory]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top));
        if (visible[0]) {
          const category = visible[0].target.getAttribute("data-category");
          if (category && category !== selectedCategory) {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
            }
            rafRef.current = requestAnimationFrame(() => {
              setSelectedCategory(category);
            });
          }
        }
      },
      {
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0.1,
      }
    );
    sections.forEach((section) => {
      const node = sectionRefs.current[section.category];
      if (node) observer.observe(node);
    });
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [sections, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-background flex items-center justify-center">
        <p className="text-black text-xl">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background text-black">
      {/* Header */}
      <header className="bg-app-card border-b border-app-border sticky top-0 z-40">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo width={240} height={72} className="h-16 sm:h-20 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              {savedTable && savedPhone && (
                <Button
                  onClick={() => {
                    window.location.href = `/comanda?table=${savedTable}&phone=${savedPhone}`;
                  }}
                  variant="outline"
                  className="border-app-border hover:bg-gray-100 text-black tech-shadow tech-hover font-normal text-lg px-6 py-3"
                >
                  <Receipt className="w-6 h-6 mr-2 icon-3d" />
                  Minha Comanda
                </Button>
              )}
              <Button
                onClick={() => setShowCart(true)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal relative text-3xl px-12 py-6"
              >
                <ShoppingCart className="w-8 h-8 mr-3 icon-3d" />
                Comanda
                {cartItemCount > 0 && (
                  <span className="ml-3 bg-white text-brand-primary rounded-full px-4 py-1.5 text-base font-normal">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-6">
        {/* Establishment Info */}
        <div className="mb-6">
          <Card className="bg-app-card border-app-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary text-xl font-normal">
                  {establishmentInfo.name.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-normal text-black">
                      {establishmentInfo.name}
                    </h2>
                    <span className="text-lg text-gray-500">›</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600">
                      {establishmentInfo.category}
                    </span>
                    <span className="text-sm text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                      {establishmentInfo.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <div>{establishmentInfo.addressNote}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Filter */}
        <div className="sticky top-[96px] z-30 bg-app-background pt-2 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sections.map((section) => (
              <Button
                key={section.category}
                variant={selectedCategory === section.category ? "default" : "outline"}
                onClick={() => {
                  const node = sectionRefs.current[section.category];
                  if (node) {
                    node.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`text-2xl px-10 py-5 whitespace-nowrap ${
                  selectedCategory === section.category
                    ? "bg-[#FFA500] text-black"
                    : "border-app-border text-black hover:bg-gray-100"
                }`}
              >
                {section.category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nenhum produto disponível</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {sections.map((section) => (
              <div
                key={section.category}
                ref={(node) => {
                  sectionRefs.current[section.category] = node;
                }}
                data-category={section.category}
                className="scroll-mt-[160px]"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-app-border" />
                  <h2 className="text-2xl sm:text-3xl font-normal text-black">
                    {section.category}
                  </h2>
                  <div className="h-px flex-1 bg-app-border" />
                </div>
                <div className="flex flex-col gap-6">
                  {section.products.map((product) => (
                    <Card
                      key={product.id}
                      className="bg-app-card border-app-border shadow-none hover:border-brand-primary/30"
                    >
                      <CardContent className="p-6 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="text-2xl sm:text-3xl font-normal text-black">
                            {product.name}
                          </h2>
                          <span className="text-2xl sm:text-3xl font-normal text-brand-primary">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                        <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
                          {product.description || "-"}
                        </p>
                        <div className="flex items-center justify-end">
                          <Button
                            onClick={() => addToCart(product)}
                            size="sm"
                            className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-2xl px-10 py-5"
                          >
                            <Plus className="w-7 h-7 mr-2 icon-3d" />
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <MenuCart
        cart={cart}
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
        total={cartTotal}
      />

      {/* Checkout Modal */}
      <MenuCheckout
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        total={cartTotal}
        onSuccess={(id, table, phone) => {
          setCart([]);
          setShowCheckout(false);
          setOrderId(id);
          setOrderTable(table);
          setOrderPhone(phone);
          
          // Salvar mesa e telefone no localStorage para manter a comanda
          if (table && phone && typeof window !== "undefined") {
            localStorage.setItem("comanda_table", table.toString());
            localStorage.setItem("comanda_phone", phone.replace(/\D/g, ""));
            setSavedTable(table);
            setSavedPhone(phone.replace(/\D/g, ""));
          }
          
          setShowSuccess(true);
        }}
      />

      {/* Success Modal */}
      <MenuSuccess
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setOrderId(undefined);
          setOrderTable(undefined);
          setOrderPhone(undefined);
        }}
        orderId={orderId}
        table={orderTable}
        phone={orderPhone}
      />
    </div>
  );
}
