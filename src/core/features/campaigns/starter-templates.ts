const jobs = [
  ['newsletter', 'Newsletter', 'Your latest news', 'Share the news, ideas and stories your readers subscribed to receive.'],
  ['promotion', 'Promotion', 'An offer for your readers', 'Describe the offer, its terms and when it ends.'],
  ['launch', 'Product launch', 'Meet your next favourite', 'Introduce the product and explain what makes it useful.'],
  ['welcome', 'Welcome', 'Welcome aboard', 'Thank your reader for joining and explain what to expect.'],
  ['cart', 'Abandoned cart', 'Something caught your eye', 'Help your reader return to their cart. Add their products before use.'],
  ['browse', 'Browse abandonment', 'Take another look', 'Invite your reader to explore the products they viewed.'],
  ['thanks', 'Post-purchase thank-you', 'Thanks for your order', 'Thank your customer and share useful care or getting-started advice.'],
  ['review', 'Review request', 'How did we do?', 'Invite your customer to share an honest review.'],
  ['winback', 'Win-back', 'It has been a while', 'Share a useful reason to reconnect with your brand.'],
  ['event', 'Event invitation', 'You are invited', 'Add the event details, time zone and how to take part.'],
  ['permission', 'Re-permission', 'Would you like to keep hearing from us?', 'Ask already eligible readers to choose their future preferences.'],
] as const;

/** Editorial starting content, never customer facts or an activated automation. */
export const starterTemplates = jobs.map(([id, name, subject, paragraph]) => ({
  id: `starter-${id}`, name, kind: 'starter' as const,
  composition: { name, emailSubject: subject, preheader: subject, emailBody: `<h1>${subject}</h1><p>${paragraph}</p>` },
}));
