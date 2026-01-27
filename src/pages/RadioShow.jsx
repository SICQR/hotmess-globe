import React from 'react';
import { useParams } from 'react-router-dom';
import RadioShowDetail from '../components/radio/RadioShowDetail';

/**
 * Consolidated Radio Show Page
 * Reads show slug from URL params and renders the show detail.
 * 
 * Replaces the individual pages:
 * - WakeTheMess.jsx (slug: wake-the-mess)
 * - DialADaddy.jsx (slug: dial-a-daddy)
 * - HandNHand.jsx (slug: hand-n-hand)
 */
export default function RadioShow() {
  const { slug } = useParams();
  return <RadioShowDetail slug={slug} />;
}
