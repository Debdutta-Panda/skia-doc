import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Skia for C++ developers</p>
          <Heading as="h1" className={styles.heroTitle}>
            Practical Skia docs with working code and visual examples.
          </Heading>
          <p className={styles.heroSubtitle}>
            Learn Skia through setup guides, focused API references, and examples that show what
            each call produces on screen.
          </p>
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Start with setup
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/examples/transformations">
              Browse examples
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Skia C++ docs and examples"
      description="Practical Skia documentation with Windows-focused setup guidance, API walkthroughs, and C++ examples for canvas, paint, SVG, transforms, and image adjustments.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
