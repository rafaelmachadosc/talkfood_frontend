"use client";

import { useState, useEffect } from "react";
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

        setProducts(productsData);
        const uniqueCategories = Array.from(
          new Set(
            (productsData || [])
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

  const filteredProducts = selectedCategory
    ? products.filter((p) => (p.category || "").trim() === selectedCategory)
    : products;

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo width={120} height={36} className="h-9 w-auto" />
              <h1 className="text-2xl sm:text-3xl font-normal text-brand-primary tracking-tight">
                Cardápio Online
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {savedTable && savedPhone && (
                <Button
                  onClick={() => {
                    window.location.href = `/comanda?table=${savedTable}&phone=${savedPhone}`;
                  }}
                  variant="outline"
                  className="border-app-border hover:bg-gray-100 text-black tech-shadow tech-hover font-normal text-base px-4 py-2"
                >
                  <Receipt className="w-5 h-5 mr-2 icon-3d" />
                  Minha Comanda
                </Button>
              )}
              <Button
                onClick={() => setShowCart(true)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal relative text-base px-4 py-2"
              >
                <ShoppingCart className="w-5 h-5 mr-2 icon-3d" />
                Comanda
                {cartItemCount > 0 && (
                  <span className="ml-2 bg-white text-brand-primary rounded-full px-2 py-0.5 text-xs font-normal">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Categories Filter */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
                  className={`text-base px-4 py-2 ${
                selectedCategory === null
                  ? "bg-brand-primary text-black"
                  : "border-app-border text-black hover:bg-gray-100"
              }`}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`text-base px-4 py-2 ${
                  selectedCategory === category
                    ? "bg-brand-primary text-black"
                    : "border-app-border text-black hover:bg-gray-100"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nenhum produto disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="bg-app-card border-app-border tech-shadow tech-hover hover:border-brand-primary/30"
              >
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-base sm:text-lg text-gray-700 line-clamp-2 self-end text-right max-w-[85%]">
                      {product.description || "-"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-normal text-brand-primary">
                      {formatPrice(product.price)}
                    </span>
                    <Button
                      onClick={() => addToCart(product)}
                      size="sm"
                      className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-base px-4 py-2"
                    >
                      <Plus className="w-4 h-4 mr-1 icon-3d" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
