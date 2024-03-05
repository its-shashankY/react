/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {copy} from 'clipboard-js';
import * as React from 'react';
import {Fragment, useCallback, useContext} from 'react';
import {TreeDispatcherContext} from './TreeContext';
import {BridgeContext, ContextMenuContext, StoreContext} from '../context';
import ContextMenu from '../../ContextMenu/ContextMenu';
import ContextMenuItem from '../../ContextMenu/ContextMenuItem';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Icon from '../Icon';
import InspectedElementBadges from './InspectedElementBadges';
import InspectedElementContextTree from './InspectedElementContextTree';
import InspectedElementErrorsAndWarningsTree from './InspectedElementErrorsAndWarningsTree';
import InspectedElementHooksTree from './InspectedElementHooksTree';
import InspectedElementPropsTree from './InspectedElementPropsTree';
import InspectedElementStateTree from './InspectedElementStateTree';
import InspectedElementStyleXPlugin from './InspectedElementStyleXPlugin';
import InspectedElementSuspenseToggle from './InspectedElementSuspenseToggle';
import NativeStyleEditor from './NativeStyleEditor';
import ElementBadges from './ElementBadges';
import {useHighlightNativeElement} from '../hooks';
import {
  copyInspectedElementPath as copyInspectedElementPathAPI,
  storeAsGlobal as storeAsGlobalAPI,
} from 'react-devtools-shared/src/backendAPI';
import {enableStyleXFeatures} from 'react-devtools-feature-flags';
import {logEvent} from 'react-devtools-shared/src/Logger';

import styles from './InspectedElementView.css';

import type {ContextMenuContextType} from '../context';
import type {
  Element,
  InspectedElement,
} from 'react-devtools-shared/src/frontend/types';
import type {HookNames} from 'react-devtools-shared/src/frontend/types';
import type {ToggleParseHookNames} from './InspectedElementContext';

export type CopyPath = (path: Array<string | number>) => void;
export type InspectPath = (path: Array<string | number>) => void;

type Props = {
  element: Element,
  hookNames: HookNames | null,
  inspectedElement: InspectedElement,
  parseHookNames: boolean,
  toggleParseHookNames: ToggleParseHookNames,
};

export default function InspectedElementView({
  element,
  hookNames,
  inspectedElement,
  parseHookNames,
  toggleParseHookNames,
}: Props): React.Node {
  const {id} = element;
  const {owners, rendererPackageName, rendererVersion, rootType, source} =
    inspectedElement;

  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const {
    isEnabledForInspectedElement: isContextMenuEnabledForInspectedElement,
    viewAttributeSourceFunction,
  } = useContext<ContextMenuContextType>(ContextMenuContext);

  const rendererLabel =
    rendererPackageName !== null && rendererVersion !== null
      ? `${rendererPackageName}@${rendererVersion}`
      : null;
  const showOwnersList = owners !== null && owners.length > 0;
  const showRenderedBy =
    showOwnersList || rendererLabel !== null || rootType !== null;

  return (
    <Fragment>
      <div className={styles.InspectedElement}>
        <InspectedElementBadges element={element} />

        <InspectedElementPropsTree
          bridge={bridge}
          element={element}
          inspectedElement={inspectedElement}
          store={store}
        />

        <InspectedElementSuspenseToggle
          bridge={bridge}
          inspectedElement={inspectedElement}
          store={store}
        />

        <InspectedElementStateTree
          bridge={bridge}
          element={element}
          inspectedElement={inspectedElement}
          store={store}
        />

        <InspectedElementHooksTree
          bridge={bridge}
          element={element}
          hookNames={hookNames}
          inspectedElement={inspectedElement}
          parseHookNames={parseHookNames}
          store={store}
          toggleParseHookNames={toggleParseHookNames}
        />

        <InspectedElementContextTree
          bridge={bridge}
          element={element}
          inspectedElement={inspectedElement}
          store={store}
        />

        {enableStyleXFeatures && (
          <InspectedElementStyleXPlugin
            bridge={bridge}
            element={element}
            inspectedElement={inspectedElement}
            store={store}
          />
        )}

        <InspectedElementErrorsAndWarningsTree
          bridge={bridge}
          element={element}
          inspectedElement={inspectedElement}
          store={store}
        />

        <NativeStyleEditor />

        {showRenderedBy && (
          <div
            className={styles.Owners}
            data-testname="InspectedElementView-Owners">
            <div className={styles.OwnersHeader}>rendered by</div>

            {showOwnersList &&
              owners?.map(owner => (
                <OwnerView
                  key={owner.id}
                  displayName={owner.displayName || 'Anonymous'}
                  hocDisplayNames={owner.hocDisplayNames}
                  compiledWithForget={owner.compiledWithForget}
                  id={owner.id}
                  isInStore={store.containsElement(owner.id)}
                  type={owner.type}
                />
              ))}

            {rootType !== null && (
              <div className={styles.OwnersMetaField}>{rootType}</div>
            )}
            {rendererLabel !== null && (
              <div className={styles.OwnersMetaField}>{rendererLabel}</div>
            )}
          </div>
        )}

        {source !== null && (
          <Source sourceURL={source.sourceURL} line={source.line} />
        )}
      </div>

      {isContextMenuEnabledForInspectedElement && (
        <ContextMenu id="InspectedElement">
          {({path, type: pathType}) => {
            const copyInspectedElementPath = () => {
              const rendererID = store.getRendererIDForElement(id);
              if (rendererID !== null) {
                copyInspectedElementPathAPI({
                  bridge,
                  id,
                  path,
                  rendererID,
                });
              }
            };

            const storeAsGlobal = () => {
              const rendererID = store.getRendererIDForElement(id);
              if (rendererID !== null) {
                storeAsGlobalAPI({
                  bridge,
                  id,
                  path,
                  rendererID,
                });
              }
            };

            return (
              <Fragment>
                <ContextMenuItem
                  onClick={copyInspectedElementPath}
                  title="Copy value to clipboard">
                  <Icon className={styles.ContextMenuIcon} type="copy" /> Copy
                  value to clipboard
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={storeAsGlobal}
                  title="Store as global variable">
                  <Icon
                    className={styles.ContextMenuIcon}
                    type="store-as-global-variable"
                  />{' '}
                  Store as global variable
                </ContextMenuItem>
                {viewAttributeSourceFunction !== null &&
                  pathType === 'function' && (
                    <ContextMenuItem
                      onClick={() => viewAttributeSourceFunction(id, path)}
                      title="Go to definition">
                      <Icon className={styles.ContextMenuIcon} type="code" /> Go
                      to definition
                    </ContextMenuItem>
                  )}
              </Fragment>
            );
          }}
        </ContextMenu>
      )}
    </Fragment>
  );
}

// This function is based on describeComponentFrame() in packages/shared/ReactComponentStackFrame
function formatSourceForDisplay(sourceURL: string, line: number) {
  // Note: this RegExp doesn't work well with URLs from Metro,
  // which provides bundle URL with query parameters prefixed with /&
  const BEFORE_SLASH_RE = /^(.*)[\\\/]/;

  let nameOnly = sourceURL.replace(BEFORE_SLASH_RE, '');

  // In DEV, include code for a common special case:
  // prefer "folder/index.js" instead of just "index.js".
  if (/^index\./.test(nameOnly)) {
    const match = sourceURL.match(BEFORE_SLASH_RE);
    if (match) {
      const pathBeforeSlash = match[1];
      if (pathBeforeSlash) {
        const folderName = pathBeforeSlash.replace(BEFORE_SLASH_RE, '');
        nameOnly = folderName + '/' + nameOnly;
      }
    }
  }

  return `${nameOnly}:${sourceURL}`;
}

type SourceProps = {
  sourceURL: string,
  line: number,
};

function Source({sourceURL, line}: SourceProps) {
  const handleCopy = () => copy(`${sourceURL}:${line}`);
  return (
    <div className={styles.Source} data-testname="InspectedElementView-Source">
      <div className={styles.SourceHeaderRow}>
        <div className={styles.SourceHeader}>source</div>
        <Button onClick={handleCopy} title="Copy to clipboard">
          <ButtonIcon type="copy" />
        </Button>
      </div>
      <div className={styles.SourceOneLiner}>
        {formatSourceForDisplay(sourceURL, line)}
      </div>
    </div>
  );
}

type OwnerViewProps = {
  displayName: string,
  hocDisplayNames: Array<string> | null,
  compiledWithForget: boolean,
  id: number,
  isInStore: boolean,
};

function OwnerView({
  displayName,
  hocDisplayNames,
  compiledWithForget,
  id,
  isInStore,
}: OwnerViewProps) {
  const dispatch = useContext(TreeDispatcherContext);
  const {highlightNativeElement, clearHighlightNativeElement} =
    useHighlightNativeElement();

  const handleClick = useCallback(() => {
    logEvent({
      event_name: 'select-element',
      metadata: {source: 'owner-view'},
    });
    dispatch({
      type: 'SELECT_ELEMENT_BY_ID',
      payload: id,
    });
  }, [dispatch, id]);

  return (
    <Button
      key={id}
      className={styles.OwnerButton}
      disabled={!isInStore}
      onClick={handleClick}
      onMouseEnter={() => highlightNativeElement(id)}
      onMouseLeave={clearHighlightNativeElement}>
      <span className={styles.OwnerContent}>
        <span
          className={`${styles.Owner} ${isInStore ? '' : styles.NotInStore}`}
          title={displayName}>
          {displayName}
        </span>

        <ElementBadges
          hocDisplayNames={hocDisplayNames}
          compiledWithForget={compiledWithForget}
        />
      </span>
    </Button>
  );
}
