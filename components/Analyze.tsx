'use client';

import React, { useState, useEffect } from "react";
import Diamond3D from "./Diamond3D";
import { ethers } from "ethers";
import { getFacets } from "../primitives/Diamond";
import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
// import { useActiveAccount } from "thirdweb/react";
// import { getThirdwebClient } from "../src/utils/createThirdwebClient"; // Does not exist
// import { diamondAddress } from "../primitives/Diamond"; // Use from prop or fetch?

interface Facet {
  facetAddress: string;
  selectors: string[];
}

// Simple delay helper
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const cacheKey = "facetCache_NFTPD"; // Distinct cache key

export function readCache() {
  if (typeof window === 'undefined') return { contractNames: {}, methodNames: {}, abis: {} };
  const cache = localStorage.getItem(cacheKey);
  return cache ? JSON.parse(cache) : { contractNames: {}, methodNames: {}, abis: {} };
}

export function writeCache(cache: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(cacheKey, JSON.stringify(cache));
}

function classifyMethods(abi: any[], selectors: string[]) {
  const readMethods: string[] = [];
  const writeMethods: string[] = [];
  const iface = new ethers.Interface(abi);
  for (const selector of selectors) {
    try {
      const method = iface.getFunction(selector);
      if (method) {
        if (method.stateMutability === "view" || method.stateMutability === "pure") {
          readMethods.push(method.name);
        } else {
          writeMethods.push(method.name);
        }
      }
    } catch (error) {
      // console.warn(`Error classifying selector ${selector}:`, error);
    }
  }
  return { readMethods, writeMethods };
}

// Adapted API call using /api/explorer logic
async function fetchABIFromBaseScan(address: string, apiKey: string, cache: any) {
  if (cache.abis[address]) return cache.abis[address];
  try {
    // No queue, just fetch
    await delay(300); // Small rate limit
    const response = await fetch(
      `/api/explorer/abi?address=${address}`
    );
    const data = await response.json();
    if (data.status === "1") {
      try {
        const abi = JSON.parse(data.result);
        cache.abis[address] = abi;
        writeCache(cache);
        return abi;
      } catch (parseError) {
        return null;
      }
    }
  } catch (error) {
    console.error(`Network error fetching ABI for ${address}:`, error);
  }
  return null;
}

async function fetchContractNameFromBaseScan(address: string, apiKey: string, cache: any) {
  if (cache.contractNames[address]) return cache.contractNames[address];
  try {
    await delay(300);
    const response = await fetch(
      `/api/explorer/name?address=${address}`
    );
    const data = await response.json();
    if (data.status === "1" && data.result?.[0]?.ContractName) {
      const contractName = data.result[0].ContractName;
      cache.contractNames[address] = contractName;
      writeCache(cache);
      return contractName;
    }
  } catch (error) {
    console.error(error);
  }
  return "Unknown Contract";
}

async function processFacets(formattedFacets: Facet[], cache: any) {
  const methodNamesLookup: { [key: string]: { readMethods: string[]; writeMethods: string[] } } = {};
  const facetNamesLookup: { [key: string]: string } = {};

  for (const facet of formattedFacets) {
    try {
      // 1. Get Name
      const contractName = await fetchContractNameFromBaseScan(facet.facetAddress, '', cache);
      facetNamesLookup[facet.facetAddress] = contractName || "Unknown";

      // 2. Get ABI
      const abi = await fetchABIFromBaseScan(facet.facetAddress, '', cache);
      if (!abi) {
        methodNamesLookup[facet.facetAddress] = { readMethods: [], writeMethods: [] };
        continue;
      }

      // 3. Classify
      const { readMethods, writeMethods } = classifyMethods(abi, facet.selectors);
      methodNamesLookup[facet.facetAddress] = { readMethods, writeMethods };

    } catch (e) {
      console.error(e);
    }
  }
  return { methodNamesLookup, facetNamesLookup };
}

interface AnalyzePanelProps {
  directoryFacetAddress?: string;
  p0?: string;
  cache?: any;
}

const AnalyzePanel: React.FC<AnalyzePanelProps> = () => {
  const [facets, setFacets] = useState<Facet[]>([]);
  const [methodNames, setMethodNames] = useState<any>({});
  const [facetNames, setFacetNames] = useState<any>({});
  const [facetAbis, setFacetAbis] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const currentCache = readCache();

      try {
        const data = await getFacets();
        const formattedFacets = data.map((f: any) => ({
          facetAddress: f.target as string,
          selectors: Array.from(f.selectors) as string[],
        }));
        setFacets(formattedFacets);

        const { methodNamesLookup, facetNamesLookup } = await processFacets(formattedFacets, currentCache);

        const abis: any = {};
        formattedFacets.forEach((f: Facet) => {
          if (currentCache.abis[f.facetAddress]) {
            abis[f.facetAddress] = currentCache.abis[f.facetAddress];
          }
        });
        setFacetAbis(abis);

        setMethodNames(methodNamesLookup);
        setFacetNames(facetNamesLookup);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading diamond data:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
      {/* Diamond3D handles its own pointer events for the canvas */}
      <div className="w-full h-full pointer-events-auto">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-white font-mono animate-pulse tracking-widest text-sm">
                INITIALIZING.NET...
              </div>
            </div>
          </div>
        ) : (
          <Diamond3D
            facets={facets}
            methodNames={methodNames}
            facetNames={facetNames}
            facetAbis={facetAbis}
          />
        )}
      </div>
    </div>
  );
};

export default AnalyzePanel;
