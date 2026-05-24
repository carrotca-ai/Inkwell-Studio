"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGrid, Trash2 } from "lucide-react";
import { gallery, type GalleryItem, subscribeGallery } from "@/lib/store";

export default function VaultPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(gallery.list());
    sync();
    const unsub = subscribeGallery(sync);
    const onPageShow = () => sync();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      unsub();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  function remove(id: string) {
    gallery.remove(id);
    setItems(gallery.list());
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold tracking-tight">Vault</h1>
          <p className="text-label-md text-on-surface-variant mt-1">
            {items.length} {items.length === 1 ? "image" : "images"}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 text-on-surface-variant">
          <LayoutGrid className="w-8 h-8" strokeWidth={1.5} />
          <p className="text-body-md">Your generated images will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {items.map((item, i) => {
            const v = item.versions[item.activeIndex] ?? item.versions[0];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative aspect-square rounded-2xl overflow-hidden razor-edge group"
              >
                <Link href={`/edit/${item.id}`} className="block w-full h-full">
                  <Image
                    src={v.url}
                    alt={v.prompt}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                </Link>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-label-sm text-white/90 line-clamp-2">{v.prompt}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    remove(item.id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container-low/80 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4 text-white" strokeWidth={1.8} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
