'use client';
import { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import parse from 'html-react-parser';
import { FaFacebook, FaXTwitter, FaLinkedin, FaInstagram, FaMedium, FaPatreon, FaDiscord } from 'react-icons/fa6';

// Medium RSS Feed URL (replace with your Medium username or publication handle)
const MEDIUM_RSS_URL = 'https://medium.com/feed/@INVISIBLEENEMIES';

// Utility function to extract the first image from the HTML content
const extractFirstImage = (htmlString: string) => {
  const imgTag = htmlString.match(/<img[^>]+src="([^">]+)"/);
  return imgTag ? imgTag[1] : null;
};

// Placeholder image for articles with broken or missing images
const PLACEHOLDER_IMAGE = '/LearnBanner.png';

// Utility function to remove the first image (or figure) from the HTML content
const removeFirstImageOrFigure = (htmlString: string) => {
  return htmlString.replace(/<figure[^>]*>.*?<\/figure>|<img[^>]+>/, '');
};

export default function LearnForm() {
  // Medium blog functionality - commented out for future use
  // const [articles, setArticles] = useState<any[]>([]);
  // const [expandedTileId, setExpandedTileId] = useState<number | null>(null);
  // const [brokenImages, setBrokenImages] = useState<{ [key: string]: boolean }>({}); // Track broken images

  // useEffect(() => {
  //   // Fetch the Medium RSS Feed and parse it
  //   const fetchArticles = async () => {
  //     try {
  //       const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(MEDIUM_RSS_URL)}`);
  //       const feedData = response.data.items;
  //       setArticles(feedData);
  //     } catch (error) {
  //       console.error('Error fetching Medium feed:', error);
  //     }
  //   };

  //   fetchArticles();
  // }, []);

  // const handleTileClick = (id: number) => {
  //   setExpandedTileId(prev => (prev === id ? null : id)); // Toggle expanded state
  // };

  // const handleImageError = (index: number) => {
  //   setBrokenImages(prev => ({ ...prev, [index]: true })); // Mark image as broken
  // };

  return (
    <div className="scroll-container custom-scrollbar isolate space-y-4 sm:space-y-2 rounded-2xl shadow-lg bg-black/50 p-2 w-full md:w-3/4 lg:w-1/2 mx-auto" style={{
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      maxHeight: '75vh', // Ensure the panel is scrollable
      overflowY: 'auto'
    }}>
      <div className="h-auto overflow-hidden rounded-xl ring-white/20 ring-5 ring-inset border-2 border-white/30 mb-4">
        <img src="https://storage.googleapis.com/tgl_cdn/images/nftpdbanner.jpg" alt="Learn Banner" className="w-full object-cover"/>
      </div>

      <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40">
        <h2 className="block text-center text-sm font-medium text-white/80">
          Learn More
        </h2>
      </div>

      {/* Social Media Links */}
      <div className="flex justify-around my-4">
        {/* <a href="https://facebook.com" target="_blank" className="text-white hover:text-blue-500">
          <FaFacebook size={32} />
        </a> */}
        <a href="https://x.com/ProjectNFTPD" target="_blank" className="text-white hover:text-gray-400"> {/* New X logo */}
          <FaXTwitter size={32} />
        </a>
        {/* <a href="https://linkedin.com" target="_blank" className="text-white hover:text-blue-600">
          <FaLinkedin size={32} />
        </a> */}
        {/* <a href="https://www.instagram.com/invisibleenemiesofficial/" target="_blank" className="text-white hover:text-pink-500">
          <FaInstagram size={32} />
        </a>
        <a href="https://medium.com/@INVISIBLEENEMIES" target="_blank" className="text-white hover:text-green-600">
          <FaMedium size={32} />
        </a> */}
        {/* <a href="https://patreon.com" target="_blank" className="text-white hover:text-orange-600">
          <FaPatreon size={32} />
        </a> */}
        <a href="https://discord.gg/q4tFymyAnx" target="_blank" className="text-white hover:text-gray-400">
          <FaDiscord size={32} />
        </a>
      </div>

      {/* Main Website Link - Replace with Medium articles when blog is ready */}
      <a href="https://nftpd.org" target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative rounded-xl overflow-hidden ring-1 ring-inset ring-white/20 hover:ring-2 hover:ring-white/40 transition-all duration-200 cursor-pointer group">
          <img 
            src="/visit.png" 
            alt="Visit Main Website" 
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8">
            <span className="text-white text-xl font-semibold">Visit Main Website →</span>
          </div>
        </div>
      </a>

      {/* Medium Articles Feed - Commented out for future use */}
      {/* {articles
        .filter(article => extractFirstImage(article.description))
        .map((article, index) => {
          const firstImage = extractFirstImage(article.description);

          return (
            <div key={index} className="relative rounded-xl p-4 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40 cursor-pointer transition-transform transform hover:scale-102 mb-4"
              onClick={() => handleTileClick(index)}
            >
              <div className="flex items-center justify-between">
                <div className="w-1/3">
                  <img
                    src={brokenImages[index] ? PLACEHOLDER_IMAGE : firstImage || undefined}
                    alt={article.title}
                    onError={() => handleImageError(index)}
                    className="w-full h-auto rounded-lg object-cover"
                    style={{ aspectRatio: '16 / 9' }}
                  />
                </div>

                <div className="w-2/3 pl-4">
                  <h3 className="text-lg font-semibold text-white">{article.title}</h3>
                  <p className="text-sm text-white/80">
                    {expandedTileId === index ? 'Click to collapse' : 'Click to expand'}
                  </p>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-white transition-transform ${expandedTileId === index ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {expandedTileId === index && (
                <div className="mt-4 text-white space-y-4 leading-relaxed">
                  {parse(removeFirstImageOrFigure(article.description))}

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-full transition-colors duration-200"
                  >
                    Read More
                  </a>
                </div>
              )}
            </div>
          );
        })} */}
    </div>
  );
}
