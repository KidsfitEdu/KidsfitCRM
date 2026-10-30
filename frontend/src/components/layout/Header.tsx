'use client';
import { Bell, Moon, Search, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function Header({todayLabel,userName,search,setSearch,dark,setDark}:{todayLabel:string;userName:string;search:string;setSearch:(v:string)=>void;dark:boolean;setDark:(v:boolean|((current:boolean)=>boolean))=>void}) {
 return <>
        <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur-xl sm:px-7">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-[-0.03em] sm:text-xl">
              Chào buổi sáng, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-64 rounded-xl bg-card pl-9"
                placeholder="Tìm kiếm nhanh…"
              />
            </div>
            <Button
              onClick={() => setDark((value) => !value)}
              variant="outline"
              size="icon"
              aria-label="Đổi giao diện"
              className="rounded-xl"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Thông báo"
              className="relative rounded-xl"
            >
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#f46f64] ring-2 ring-background" />
            </Button>
            <div className="ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-sm font-bold text-[#633b38]">
              {initials(userName)}
            </div>
          </div>
        </header>


 </>;
}
