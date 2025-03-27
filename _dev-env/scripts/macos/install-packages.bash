#! /bin/bash

# if brew isn't installed, fail
if ! command -v brew &> /dev/null
then
    echo "brew could not be found"
    exit 1
fi  

brew install gcc icu4c readline zlib curl ossp-uuid pkg-config
asdf plugin-add postgres
export OPENSSL_PATH=$(brew --prefix openssl)
export CMAKE_PREFIX_PATH=$(brew --prefix icu4c)
export PATH="$OPENSSL_PATH/bin:$CMAKE_PREFIX_PATH/bin:$PATH"
export LDFLAGS="-L$OPENSSL_PATH/lib $LDFLAGS"
export CPPFLAGS="-I$OPENSSL_PATH/include $CPPFLAGS"
export PKG_CONFIG_PATH="$CMAKE_PREFIX_PATH/lib/pkgconfig"


asdf install