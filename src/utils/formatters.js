export function formatYear(date) {
    return date ? String(date).slice(0, 4) : "—";
}

export function formatCount(value) {
    return typeof value === "number" ? value.toLocaleString("it-IT") : "—";
}