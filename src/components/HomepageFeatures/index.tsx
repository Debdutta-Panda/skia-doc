import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Practical Setup Guidance',
    description: (
      <>
        Windows-first setup notes, Visual Studio integration details, and a path from a blank
        project to a working Skia app.
      </>
    ),
  },
  {
    title: 'Visual API Examples',
    description: (
      <>
        Core drawing APIs are paired with images and compact C++ snippets so it is easier to see
        what each call actually does.
      </>
    ),
  },
  {
    title: 'Advanced Building Blocks',
    description: (
      <>
        Topics like SVG, color filters, runtime effects, transforms, and Unicode text are covered
        with a practical developer focus.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCard)}>
      <div className={styles.featureInner}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">What You Will Find Here</Heading>
          <p>
            This documentation is meant to be read while building. It favors code you can run,
            screenshots you can compare against, and explanations that stay close to real Skia APIs.
          </p>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
