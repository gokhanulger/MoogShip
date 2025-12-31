// Specialized Etsy email parser
export function parseEtsyOrderEmail(parsed: any): any {
  try {
    // Initialize order object
    const order: any = {
      orderNumber: '',
      buyerName: '',
      buyerEmail: '',
      shipToName: '',
      shipToAddress1: '',
      shipToAddress2: '',
      shipToCity: '',
      shipToState: '',
      shipToCountry: 'USA',
      shipToZip: '',
      orderTotal: 0,
      subtotal: 0,
      shippingCost: 0,
      taxTotal: 0,
      currency: 'USD',
      items: []
    };

    // 1. Extract from subject line first
    const subject = parsed.subject || '';
    
    // Extract order number from subject: "Order #3829789244]"
    const orderNumMatch = subject.match(/Order\s*#(\d+)/i);
    if (orderNumMatch) {
      order.orderNumber = orderNumMatch[1];
    }
    
    // Extract price from subject: "[$137.75" or "[US$137.75" or "[USD 137.75"
    const priceMatch = subject.match(/\[\s*(?:US\$|USD\s+)?\$?([0-9,]+(?:\.\d{2})?)/);
    if (priceMatch) {
      order.orderTotal = parseFloat(priceMatch[1].replace(',', ''));
    }

    // 2. Get email body text
    let text = parsed.text || '';
    
    // If no text content, try to extract from HTML
    if (!text && parsed.html) {
      // Convert HTML to text, preserving structure
      text = parsed.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/=20/g, '')
        .replace(/=\n/g, '')
        .replace(/=3D/g, '=')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // 3. Extract order number from body if not found in subject
    if (!order.orderNumber) {
      const orderBodyMatch = text.match(/Your\s+order\s+number\s+is\s+(\d+)/i);
      if (orderBodyMatch) {
        order.orderNumber = orderBodyMatch[1];
      }
    }

    // 4. Extract buyer email from "Note from" or "Email" sections
    const buyerEmailMatch = text.match(/Note\s+from\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                           text.match(/\*\s*Email\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                           text.match(/Or[\s\n]+\*?\s*Email\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (buyerEmailMatch) {
      order.buyerEmail = buyerEmailMatch[1];
    }

    // 5. Extract shipping address - look for the HTML address block in the original HTML
    if (parsed.html) {
      // Look for the address HTML structure
      const addressMatch = parsed.html.match(/<address[^>]*>([\s\S]*?)<\/address>/i);
      if (addressMatch) {
        const addressHtml = addressMatch[1];
        
        // Extract name from span class='name'
        const nameMatch = addressHtml.match(/<span\s+class\s*=\s*['"]?name['"]?\s*>([^<]+)<\/span>/i);
        if (nameMatch) {
          order.buyerName = order.shipToName = nameMatch[1].trim();
        }
        
        // Extract street from span class='first-line'
        const streetMatch = addressHtml.match(/<span\s+class\s*=\s*['"]?first-line['"]?\s*>([^<]+)<\/span>/i);
        if (streetMatch) {
          order.shipToAddress1 = streetMatch[1].trim();
        }
        
        // Extract city from span class='city'
        const cityMatch = addressHtml.match(/<span\s+class\s*=\s*['"]?city['"]?\s*>([^<]+)<\/span>/i);
        if (cityMatch) {
          order.shipToCity = cityMatch[1].trim();
        }
        
        // Extract state from span class='state'
        const stateMatch = addressHtml.match(/<span\s+class\s*=\s*['"]?state['"]?\s*>([^<]+)<\/span>/i);
        if (stateMatch) {
          order.shipToState = stateMatch[1].trim();
        }
        
        // Extract zip from span class='zip'
        const zipMatch = addressHtml.match(/<span\s+class\s*=\s*['"]?zip['"]?\s*>([^<]+)<\/span>/i);
        if (zipMatch) {
          order.shipToZip = zipMatch[1].trim();
        }
      }
    }

    // 6. If address not found in HTML, try text patterns
    if (!order.shipToName || !order.shipToAddress1) {
      // Look for "Shipping Address:" section
      const addressSection = text.match(/Shipping\s+Address:\s*([\s\S]*?)(?:------|\n\n|Contacting)/i);
      if (addressSection) {
        const addressText = addressSection[1];
        const lines = addressText.split('\n').map(l => l.trim()).filter(l => l);
        
        // First non-empty line after "Shipping Address:" is usually the name
        if (lines.length > 0 && !order.shipToName) {
          // Check if it's all caps (common in Etsy emails)
          if (lines[0].match(/^[A-Z\s]+$/)) {
            order.shipToName = lines[0].split(' ')
              .map(word => word.charAt(0) + word.slice(1).toLowerCase())
              .join(' ');
          } else {
            order.shipToName = lines[0];
          }
          order.buyerName = order.shipToName;
        }
        
        // Look for street address (starts with numbers)
        for (const line of lines) {
          if (line.match(/^\d+\s+/) && !order.shipToAddress1) {
            order.shipToAddress1 = line;
          }
        }
        
        // Look for city, state, zip pattern
        const cityStateZip = addressText.match(/([A-Z][A-Za-z\s]+)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
        if (cityStateZip) {
          order.shipToCity = cityStateZip[1].trim();
          order.shipToState = cityStateZip[2].trim();
          order.shipToZip = cityStateZip[3].trim();
        }
      }
    }

    // 7. Extract pricing details
    // Order Total (if not from subject)
    if (!order.orderTotal || order.orderTotal === 0) {
      const totalMatch = text.match(/Order\s+Total:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
      if (totalMatch) {
        order.orderTotal = parseFloat(totalMatch[1].replace(',', ''));
      }
    }

    // Item total (subtotal)
    const itemTotalMatch = text.match(/Item\s+total:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
    if (itemTotalMatch) {
      order.subtotal = parseFloat(itemTotalMatch[1].replace(',', ''));
    }

    // Shipping cost
    const shippingMatch = text.match(/Shipping:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
    if (shippingMatch) {
      order.shippingCost = parseFloat(shippingMatch[1].replace(',', ''));
    }

    // Sales Tax
    const taxMatch = text.match(/Sales\s+Tax:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
    if (taxMatch) {
      order.taxTotal = parseFloat(taxMatch[1].replace(',', ''));
    }

    // 8. Extract items from HTML structure using avatar-media-block divs
    // Etsy actual structure uses divs with class="normal-copy copy" inside avatar-media-block
    if (parsed.html) {
      // Look for avatar-media-block sections which contain product details
      const avatarBlockRegex = /<div\s+class=['"]avatar-media-block['"][\s\S]*?<\/table>\s*<\/div>/gi;
      const avatarBlocks = parsed.html.match(avatarBlockRegex) || [];
      
      console.log('[EMAIL] Found', avatarBlocks.length, 'avatar-media-block sections');
      
      avatarBlocks.forEach((block, idx) => {
        // First check if this block contains product information
        // Skip blocks that are clearly not products (e.g., guest info, shipping info)
        const hasPrice = block.match(/Price:\s*\$?[0-9]/i);
        const hasQuantity = block.match(/Quantity:\s*\d+/i);
        const hasTransactionId = block.match(/Transaction\s+ID:/i);
        
        // Only process blocks that look like actual products
        if (!hasPrice && !hasQuantity && !hasTransactionId) {
          console.log('[EMAIL] Skipping non-product block', idx);
          return;
        }
        
        // Extract product image
        let imageUrl = '';
        const imgMatch = block.match(/src\s*=\s*['"]([^'"]+etsystatic[^'"]+il_75x75[^'"]+)['"]/i);
        if (imgMatch) {
          imageUrl = imgMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        }
        
        // Extract product title - look for link text within the block
        let title = '';
        const titleMatch = block.match(/<a[^>]*>\s*([^<]+)\s*<\/a>/i);
        if (titleMatch) {
          // Clean the extracted title
          title = titleMatch[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
          
          // Skip if the title is just "Guest" or other non-product text
          if (title.toLowerCase() === 'guest' || title.length < 3) {
            console.log('[EMAIL] Skipping invalid product title:', title);
            return;
          }
        }
        
        // Extract personalization details - look for text patterns in div content
        let personalization = '';
        // First, extract all text content from normal-copy divs
        const divMatches = block.match(/<div[^>]*class=['"]normal-copy[^>]*>([^<]+)<\/div>/gi) || [];
        const personalizationParts: string[] = [];
        
        divMatches.forEach(divMatch => {
          // Extract text content from each div
          const textMatch = divMatch.match(/>([^<]+)</);
          if (textMatch) {
            const text = textMatch[1].trim();
            // Check if this text contains personalization info
            if (text.match(/^(Bracelet|Personalization|Customization|Engraving|Text|Font|Size|Color|Style|Option):/i)) {
              personalizationParts.push(text);
            }
          }
        });
        
        if (personalizationParts.length > 0) {
          personalization = personalizationParts.join(', ');
        }
        
        // Extract quantity
        let quantity = 1;
        const qtyMatch = block.match(/Quantity:\s*(\d+)/i);
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1]);
        }
        
        // Extract price - look for price pattern in the block text
        let price = 0;
        // Remove all HTML tags to get clean text for price extraction
        const cleanText = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const priceMatch = cleanText.match(/Price:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', ''));
        }
        
        // Only add items that have meaningful product information
        if ((title && title.length > 3) || (imageUrl && price > 0)) {
          // Store product with personalization in parentheses for easy parsing
          let fullTitle = title || 'Etsy Product';
          if (personalization) {
            // Format personalization for clear display
            fullTitle += ` (${personalization})`;
          }
          
          order.items.push({
            title: fullTitle,
            quantity: quantity,
            price: price * 100, // Convert to cents
            imageUrl: imageUrl || undefined
          });
          
          console.log('[EMAIL] Extracted item:', {
            title: fullTitle,
            quantity,
            price,
            hasImage: !!imageUrl
          });
        }
      });
    }
    
    // Fallback: If no items found from HTML, try text-based extraction
    if (order.items.length === 0 && text) {
      console.log('[EMAIL] No items from HTML, trying text extraction');
      
      // Look for quantity in text
      const qtyTextMatch = text.match(/Quantity:\s*(\d+)/i);
      const quantity = qtyTextMatch ? parseInt(qtyTextMatch[1]) : 1;
      
      // Look for price in text  
      const priceTextMatch = text.match(/(?:Price|Item\s+price):\s*\$?([0-9,]+(?:\.\d{2})?)/i);
      const price = priceTextMatch ? parseFloat(priceTextMatch[1].replace(',', '')) : 0;
      
      // Try to find product name from various patterns
      let productName = '';
      
      // Pattern 1: Look for product-like text
      const productPatterns = [
        /(?:Item|Product|Article):\s*([^\n]+)/i,
        /((?:14K|18K|Gold|Silver|Sterling|Bracelet|Necklace|Ring|Jewelry|Custom|Personalized)[^\n]+)/i
      ];
      
      for (const pattern of productPatterns) {
        const match = text.match(pattern);
        if (match) {
          productName = match[1].trim();
          break;
        }
      }
      
      // If we have at least a price, create an item
      if (price > 0 || productName) {
        order.items.push({
          title: productName || 'Etsy Item',
          quantity: quantity,
          price: price * 100,
          imageUrl: undefined
        });
        
        console.log('[EMAIL] Created fallback item:', productName, 'qty:', quantity, 'price:', price);
      }
    }

    // 9. Extract Transaction ID (can be useful)
    const transactionMatch = text.match(/Transaction\s+ID:\s*(\d+)/i);
    if (transactionMatch) {
      order.transactionId = transactionMatch[1];
    }

    // 10. Calculate missing values
    if (!order.subtotal && order.orderTotal > 0) {
      order.subtotal = order.orderTotal - order.taxTotal - order.shippingCost;
    }

    // 11. Use defaults if name not found
    if (!order.buyerName && !order.shipToName) {
      order.buyerName = order.shipToName = 'Etsy Customer';
    }

    console.log('[EMAIL] Parsed Etsy order:', {
      orderNumber: order.orderNumber,
      buyerName: order.shipToName,
      buyerEmail: order.buyerEmail,
      address: order.shipToAddress1,
      city: order.shipToCity,
      state: order.shipToState,
      zip: order.shipToZip,
      total: order.orderTotal,
      items: order.items.length
    });

    // Return if we have minimum required data
    if (order.orderNumber && (order.orderTotal > 0 || order.items.length > 0)) {
      return order;
    }

    // Also return if we have just an order number (can fill in details later)
    if (order.orderNumber) {
      return order;
    }

    console.log('[EMAIL] Insufficient order data extracted');
    return null;

  } catch (error) {
    console.error('[EMAIL] Error parsing Etsy email:', error);
    return null;
  }
}