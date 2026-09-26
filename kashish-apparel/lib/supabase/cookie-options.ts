// Keep an unchecked “Remember me” session scoped to the browser session.
export function sessionCookieOptions<T extends {maxAge?:number;expires?:Date}>(options:T,remember:boolean){if(remember||options.maxAge===0)return options;const {maxAge,expires,...session}=options;return session}
