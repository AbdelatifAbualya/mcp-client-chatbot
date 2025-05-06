"use client";

import { appStore } from "@/app/store";
import { cn } from "lib/utils";
import { Check, ClipboardCheck, Wrench, Infinity, PenOff } from "lucide-react";
import { useEffect } from "react";
import { Button } from "ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Separator } from "ui/separator";
import { useShallow } from "zustand/shallow";

export const ToolChoiceDropDown = () => {
  const [toolChoice, appStoreMutate] = appStore(
    useShallow((state) => [state.toolChoice, state.mutate]),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate(({ toolChoice }) => {
          return {
            toolChoice:
              toolChoice == "auto"
                ? "manual"
                : toolChoice == "manual"
                  ? "none"
                  : "auto",
          };
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={toolChoice == "none" ? "ghost" : "outline"}
          className={cn(
            toolChoice == "none" ? "text-muted-foreground" : "bg-transparent",
            "font-semibold mr-1 rounded-full flex items-center gap-2",
          )}
        >
          <Wrench className="size-3.5" />
          <span>
            {toolChoice.charAt(0).toUpperCase() + toolChoice.slice(1)}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">⌘P</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2">
          Tool Choice
          <DropdownMenuShortcut>
            <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5">
              ⌘P
            </span>
          </DropdownMenuShortcut>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => appStoreMutate({ toolChoice: "auto" })}
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <Infinity />
                <span className="font-bold">Auto</span>
                {toolChoice == "auto" && <Check className="ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Decides when to use tools without asking you
              </p>
            </div>
          </DropdownMenuItem>
          <div className="px-2 py-1">
            <DropdownMenuSeparator />
          </div>
          <DropdownMenuItem
            onClick={() => appStoreMutate({ toolChoice: "manual" })}
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <ClipboardCheck />
                <span className="font-bold">Manual</span>
                {toolChoice == "manual" && <Check className="ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Asks your permission before using any tools
              </p>
            </div>
          </DropdownMenuItem>
          <div className="px-2 py-1">
            <DropdownMenuSeparator />
          </div>
          <DropdownMenuItem
            onClick={() => appStoreMutate({ toolChoice: "none" })}
          >
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <PenOff />
                <span className="font-bold">None</span>
                {toolChoice == "none" && <Check className="ml-auto" />}
              </div>

              <p className="text-xs text-muted-foreground">Do not use tools</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
