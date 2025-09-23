// MDX Module Declarations
declare module '*.mdx' {
  export const frontmatter: {
    title?: string;
    description?: string;
    updatedAt?: string;
    author?: string;
    tags?: string[];
  };

  let MDXComponent: (props: any) => JSX.Element;
  export default MDXComponent;
}

// Environment Variables
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_TW_CLIENT_ID: string;
    NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS: string;
    NEXT_PUBLIC_CHAIN_ID: string;
    NEXT_PUBLIC_BICONOMY_BUNDLER_URL?: string;
    NEXT_PUBLIC_BICONOMY_PAYMASTER_URL?: string;
    NEXT_PUBLIC_NFT_STORAGE_TOKEN?: string;
    NEXT_PUBLIC_PHOTOROOM_API_KEY?: string;
    SENTRY_AUTH_TOKEN?: string;
  }
}