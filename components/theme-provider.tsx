"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// We can't import ComponentProps from 'react' directly in older versions, 
// using React.ComponentProps is safer or just defining the type if needed.
// However, next-themes types are standard.

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
